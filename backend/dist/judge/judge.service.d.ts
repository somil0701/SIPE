import { JudgeRunResult, JudgeSubmissionResult } from './types';
declare class JudgeService {
    judgeSubmission(code: string, language: string, rawTestCases: unknown[]): Promise<JudgeSubmissionResult>;
    runCustomInput(code: string, language: string, input: string): Promise<JudgeRunResult>;
    private withPreparedWorkspace;
    private compileIfNeeded;
    private normalizeTestCases;
    private failedResultsForAllTests;
    private toTestCaseResult;
    private resolveSubmissionVerdict;
}
export declare const judgeService: JudgeService;
export {};
//# sourceMappingURL=judge.service.d.ts.map