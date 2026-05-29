"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dockerRunner = exports.DockerRunner = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
const output_1 = require("../utils/output");
const MAX_CAPTURED_OUTPUT = 64 * 1024;
function toDockerMountPath(workDir) {
    return path_1.default.resolve(workDir).replace(/\\/g, '/');
}
function appendLimited(current, chunk) {
    if (current.length >= MAX_CAPTURED_OUTPUT)
        return current;
    return (current + chunk.toString('utf8')).slice(0, MAX_CAPTURED_OUTPUT);
}
function cleanupContainer(containerName) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)(env_1.env.DOCKER_BINARY, ['rm', '-f', containerName], { windowsHide: true }, () => {
            resolve();
        });
    });
}
class DockerRunner {
    async run(options) {
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
            options.memoryLimit ?? env_1.env.JUDGE_MEMORY_LIMIT,
            '--cpus',
            options.cpuLimit ?? env_1.env.JUDGE_CPU_LIMIT,
            '--pids-limit',
            String(env_1.env.JUDGE_PIDS_LIMIT),
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
            const child = (0, child_process_1.spawn)(env_1.env.DOCKER_BINARY, args, {
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const finish = (result) => {
                if (settled)
                    return;
                settled = true;
                resolve({
                    ...result,
                    stdout: (0, output_1.truncateOutput)(result.stdout),
                    stderr: (0, output_1.truncateOutput)(result.stderr),
                });
            };
            const timeout = setTimeout(() => {
                timedOut = true;
                child.kill('SIGKILL');
                cleanupContainer(containerName).catch((error) => {
                    logger_1.logger.warn('Failed to cleanup timed out judge container', { containerName, error });
                });
            }, options.timeoutMs);
            child.stdout.on('data', (chunk) => {
                stdout = appendLimited(stdout, chunk);
            });
            child.stderr.on('data', (chunk) => {
                stderr = appendLimited(stderr, chunk);
            });
            child.on('error', (error) => {
                clearTimeout(timeout);
                if (settled)
                    return;
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
exports.DockerRunner = DockerRunner;
exports.dockerRunner = new DockerRunner();
//# sourceMappingURL=dockerRunner.js.map