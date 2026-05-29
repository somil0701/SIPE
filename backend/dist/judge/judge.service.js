"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const dockerRunner_1 = require("./docker/dockerRunner");
const runners_1 = require("./runners");
const output_1 = require("./utils/output");
class JudgeService {
    async judgeSubmission(code, language, rawTestCases) {
        const runner = (0, runners_1.getLanguageRunner)(language);
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
            const results = [];
            for (const [index, testCase] of testCases.entries()) {
                const execution = await dockerRunner_1.dockerRunner.run({
                    image: runner.image,
                    workDir,
                    command: runner.runCommand,
                    stdin: testCase.input,
                    timeoutMs: env_1.env.JUDGE_RUN_TIMEOUT_MS,
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
    async runCustomInput(code, language, input) {
        const runner = (0, runners_1.getLanguageRunner)(language);
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
            const execution = await dockerRunner_1.dockerRunner.run({
                image: runner.image,
                workDir,
                command: runner.runCommand,
                stdin: input,
                timeoutMs: env_1.env.JUDGE_RUN_TIMEOUT_MS,
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
    async withPreparedWorkspace(code, runner, callback) {
        const rootDir = path_1.default.resolve(env_1.env.JUDGE_TEMP_DIR);
        await promises_1.default.mkdir(rootDir, { recursive: true });
        const workDir = await promises_1.default.mkdtemp(path_1.default.join(rootDir, 'submission-'));
        try {
            await promises_1.default.writeFile(path_1.default.join(workDir, runner.sourceFile), code, 'utf8');
            return await callback(workDir);
        }
        finally {
            await promises_1.default.rm(workDir, { recursive: true, force: true });
        }
    }
    async compileIfNeeded(runner, workDir) {
        if (!runner.compileCommand)
            return null;
        const compile = await dockerRunner_1.dockerRunner.run({
            image: runner.image,
            workDir,
            command: runner.compileCommand,
            timeoutMs: env_1.env.JUDGE_COMPILE_TIMEOUT_MS,
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
    normalizeTestCases(rawTestCases) {
        return rawTestCases.map((raw) => {
            const testCase = raw;
            if (typeof testCase.input === 'string' || testCase.expectedOutput !== undefined) {
                return {
                    input: (0, output_1.stringifyTestValue)(testCase.input ?? ''),
                    expectedOutput: (0, output_1.stringifyTestValue)(testCase.expectedOutput ?? testCase.expected ?? ''),
                    isExample: Boolean(testCase.isExample),
                };
            }
            const args = Array.isArray(testCase.args) ? testCase.args : [testCase.args ?? ''];
            return {
                input: args.map((arg) => (0, output_1.stringifyTestValue)(arg)).join('\n'),
                expectedOutput: (0, output_1.stringifyTestValue)(testCase.expected ?? ''),
                isExample: Boolean(testCase.isExample),
            };
        });
    }
    failedResultsForAllTests(testCases, verdict, error) {
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
    toTestCaseResult(index, testCase, execution) {
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
        const passed = (0, output_1.outputsMatch)(execution.stdout, testCase.expectedOutput);
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
    resolveSubmissionVerdict(results) {
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
exports.judgeService = new JudgeService();
//# sourceMappingURL=judge.service.js.map