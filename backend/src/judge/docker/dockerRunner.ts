import { spawn, execFile } from 'child_process';
import path from 'path';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { truncateOutput } from '../utils/output';

interface DockerRunOptions {
  image: string;
  workDir: string;
  command: string[];
  stdin?: string;
  timeoutMs: number;
  memoryLimit?: string;
  cpuLimit?: string;
}

interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  executionTime: number;
}

const MAX_CAPTURED_OUTPUT = 64 * 1024;

function toDockerMountPath(workDir: string): string {
  return path.resolve(workDir).replace(/\\/g, '/');
}

function appendLimited(current: string, chunk: Buffer): string {
  if (current.length >= MAX_CAPTURED_OUTPUT) return current;
  return (current + chunk.toString('utf8')).slice(0, MAX_CAPTURED_OUTPUT);
}

function cleanupContainer(containerName: string): Promise<void> {
  return new Promise((resolve) => {
    execFile(env.DOCKER_BINARY, ['rm', '-f', containerName], { windowsHide: true }, () => {
      resolve();
    });
  });
}

export class DockerRunner {
  async run(options: DockerRunOptions): Promise<DockerRunResult> {
    const containerName = `ipe-judge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const startedAt = Date.now();

    const args = [
      'run',
      '--rm',
      '--name',
      containerName,
      '-i',
      '--network',
      'none',
      '--memory',
      options.memoryLimit ?? env.JUDGE_MEMORY_LIMIT,
      '--cpus',
      options.cpuLimit ?? env.JUDGE_CPU_LIMIT,
      '--pids-limit',
      String(env.JUDGE_PIDS_LIMIT),
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,nosuid,nodev,size=64m',
      '-v',
      `${toDockerMountPath(options.workDir)}:/workspace`,
      '-w',
      '/workspace',
      options.image,
      ...options.command,
    ];

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      console.log("DOCKER CMD:");
console.log(env.DOCKER_BINARY, args.join(" "));

      const child = spawn(env.DOCKER_BINARY, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const finish = (result: DockerRunResult): void => {
        if (settled) return;
        settled = true;
        resolve({
          ...result,
          stdout: truncateOutput(result.stdout),
          stderr: truncateOutput(result.stderr),
        });
      };

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        cleanupContainer(containerName).catch((error: unknown) => {
          logger.warn('Failed to cleanup timed out judge container', { containerName, error });
        });
      }, options.timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout = appendLimited(stdout, chunk);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr = appendLimited(stderr, chunk);
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        finish({
          stdout,
          stderr,
          exitCode,
          timedOut,
          executionTime: Date.now() - startedAt,
        });
      });

      if (options.stdin) {
        child.stdin.write(options.stdin);
      }
      child.stdin.end();
    });
  }
}

export const dockerRunner = new DockerRunner();
