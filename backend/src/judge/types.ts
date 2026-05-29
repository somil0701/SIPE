export type JudgeLanguage = 'javascript' | 'python' | 'cpp' | 'java';

export type JudgeVerdict =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR';

export interface JudgeTestCase {
  input: string;
  expectedOutput: string;
  isExample?: boolean;
}

export interface JudgeTestCaseResult {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  executionTime: number;
  verdict: JudgeVerdict;
  error?: string;
}

export interface JudgeSubmissionResult {
  verdict: JudgeVerdict;
  testCasesPassed: number;
  testCasesTotal: number;
  executionTime: number;
  compileOutput?: string;
  results: JudgeTestCaseResult[];
}

export interface JudgeRunResult {
  status: JudgeVerdict;
  output: string;
  executionTime: number;
  compileOutput?: string;
  error?: string;
}

export interface LanguageRunner {
  language: JudgeLanguage;
  displayName: string;
  sourceFile: string;
  image: string;
  compileCommand?: string[];
  runCommand: string[];
}
