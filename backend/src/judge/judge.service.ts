import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { dockerRunner } from './docker/dockerRunner';
import { getLanguageRunner } from './runners';
import {
  JudgeRunResult,
  JudgeSubmissionResult,
  JudgeTestCase,
  JudgeTestCaseResult,
  JudgeVerdict,
  LanguageRunner,
} from './types';
import { outputsMatch, stringifyTestValue } from './utils/output';

class JudgeService {
  async judgeSubmission(
    code: string,
    language: string,
    rawTestCases: unknown[]
  ): Promise<JudgeSubmissionResult> {
    const runner = getLanguageRunner(language);
    const testCases = this.normalizeTestCases(rawTestCases);

    if (testCases.length === 0) {
      return {
        verdict: 'ACCEPTED',
        testCasesPassed: 0,
        testCasesTotal: 0,
        executionTime: 0,
        results: [],
      };
    }

    return this.withPreparedWorkspace(code, runner, async (workDir) => {
      const compileResult = await this.compileIfNeeded(runner, workDir);

      if (compileResult) {
        return {
          verdict: 'COMPILATION_ERROR',
          testCasesPassed: 0,
          testCasesTotal: testCases.length,
          executionTime: compileResult.executionTime,
          compileOutput: compileResult.message,
          results: this.failedResultsForAllTests(testCases, 'COMPILATION_ERROR', compileResult.message),
        };
      }

      const results: JudgeTestCaseResult[] = [];

      for (const [index, testCase] of testCases.entries()) {
        const execution = await dockerRunner.run({
          image: runner.image,
          workDir,
          command: runner.runCommand,
          stdin: testCase.input,
          timeoutMs: env.JUDGE_RUN_TIMEOUT_MS,
        });

        results.push(this.toTestCaseResult(index, testCase, execution));
      }

      const verdict = this.resolveSubmissionVerdict(results);
      const testCasesPassed = results.filter((result) => result.passed).length;

      return {
        verdict,
        testCasesPassed,
        testCasesTotal: results.length,
        executionTime: results.reduce((sum, result) => sum + result.executionTime, 0),
        results,
      };
    });
  }

  async runCustomInput(code: string, language: string, input: string): Promise<JudgeRunResult> {
    const runner = getLanguageRunner(language);

    return this.withPreparedWorkspace(code, runner, async (workDir) => {
      const compileResult = await this.compileIfNeeded(runner, workDir);

      if (compileResult) {
        return {
          status: 'COMPILATION_ERROR',
          output: '',
          error: compileResult.message,
          compileOutput: compileResult.message,
          executionTime: compileResult.executionTime,
        };
      }

      const execution = await dockerRunner.run({
        image: runner.image,
        workDir,
        command: runner.runCommand,
        stdin: input,
        timeoutMs: env.JUDGE_RUN_TIMEOUT_MS,
      });

      if (execution.timedOut) {
        return {
          status: 'TIME_LIMIT_EXCEEDED',
          output: execution.stdout,
          error: 'Time limit exceeded',
          executionTime: execution.executionTime,
        };
      }

      if (execution.exitCode !== 0) {
        return {
          status: 'RUNTIME_ERROR',
          output: execution.stdout,
          error: execution.stderr || 'Program exited with a non-zero status',
          executionTime: execution.executionTime,
        };
      }

      return {
        status: 'ACCEPTED',
        output: execution.stdout,
        executionTime: execution.executionTime,
      };
    });
  }

  private async withPreparedWorkspace<T>(
    code: string,
    runner: LanguageRunner,
    callback: (workDir: string) => Promise<T>
  ): Promise<T> {
    const rootDir = path.resolve(env.JUDGE_TEMP_DIR);
    await fs.mkdir(rootDir, { recursive: true });
    const workDir = await fs.mkdtemp(path.join(rootDir, 'submission-'));

    try {
      await fs.writeFile(path.join(workDir, runner.sourceFile), code, 'utf8');
      return await callback(workDir);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async compileIfNeeded(
    runner: LanguageRunner,
    workDir: string
  ): Promise<{ message: string; executionTime: number } | null> {
    if (!runner.compileCommand) return null;

    const compile = await dockerRunner.run({
      image: runner.image,
      workDir,
      command: runner.compileCommand,
      timeoutMs: env.JUDGE_COMPILE_TIMEOUT_MS,
    });

    if (compile.timedOut) {
      return {
        message: 'Compilation timed out',
        executionTime: compile.executionTime,
      };
    }

    if (compile.exitCode !== 0) {
      return {
        message: compile.stderr || compile.stdout || 'Compilation failed',
        executionTime: compile.executionTime,
      };
    }

    return null;
  }

  private normalizeTestCases(rawTestCases: unknown[]): JudgeTestCase[] {
    return rawTestCases.map((raw) => {
      const testCase = raw as Record<string, unknown>;

      if (typeof testCase.input === 'string' || testCase.expectedOutput !== undefined) {
        return {
          input: stringifyTestValue(testCase.input ?? ''),
          expectedOutput: stringifyTestValue(testCase.expectedOutput ?? testCase.expected ?? ''),
          isExample: Boolean(testCase.isExample),
        };
      }

      const args = Array.isArray(testCase.args) ? testCase.args : [testCase.args ?? ''];

      return {
        input: args.map((arg) => stringifyTestValue(arg)).join('\n'),
        expectedOutput: stringifyTestValue(testCase.expected ?? ''),
        isExample: Boolean(testCase.isExample),
      };
    });
  }

  private failedResultsForAllTests(
    testCases: JudgeTestCase[],
    verdict: JudgeVerdict,
    error: string
  ): JudgeTestCaseResult[] {
    return testCases.map((testCase, index) => ({
      index,
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual: '',
      passed: false,
      executionTime: 0,
      verdict,
      error,
    }));
  }

  private toTestCaseResult(
    index: number,
    testCase: JudgeTestCase,
    execution: {
      stdout: string;
      stderr: string;
      exitCode: number | null;
      timedOut: boolean;
      executionTime: number;
    }
  ): JudgeTestCaseResult {
    if (execution.timedOut) {
      return {
        index,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: execution.stdout,
        passed: false,
        executionTime: execution.executionTime,
        verdict: 'TIME_LIMIT_EXCEEDED',
        error: 'Time limit exceeded',
      };
    }

    if (execution.exitCode !== 0) {
      return {
        index,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: execution.stdout,
        passed: false,
        executionTime: execution.executionTime,
        verdict: 'RUNTIME_ERROR',
        error: execution.stderr || 'Program exited with a non-zero status',
      };
    }

    const passed = outputsMatch(execution.stdout, testCase.expectedOutput);

    return {
      index,
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual: execution.stdout,
      passed,
      executionTime: execution.executionTime,
      verdict: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    };
  }

  private resolveSubmissionVerdict(results: JudgeTestCaseResult[]): JudgeVerdict {
    if (results.some((result) => result.verdict === 'TIME_LIMIT_EXCEEDED')) {
      return 'TIME_LIMIT_EXCEEDED';
    }

    if (results.some((result) => result.verdict === 'RUNTIME_ERROR')) {
      return 'RUNTIME_ERROR';
    }

    if (results.every((result) => result.passed)) {
      return 'ACCEPTED';
    }

    return 'WRONG_ANSWER';
  }
}

export const judgeService = new JudgeService();
