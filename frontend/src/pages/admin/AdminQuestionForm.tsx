import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { Code, Plus, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = ['javascript', 'python', 'cpp', 'java'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const QUESTION_TYPES = ['CODING', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'THEORETICAL', 'QUIZ'];

type LanguageKey = typeof LANGUAGES[number];

type TestCaseDraft = {
  input: string;
  expectedOutput: string;
  isExample: boolean;
};

type QuestionFormData = {
  title: string;
  slug: string;
  description: string;
  problemStatement: string;
  difficulty: string;
  type: string;
  skillId: string;
  starterCode: Record<LanguageKey, string>;
  solutionCode: Record<LanguageKey, string>;
  hints: string;
  testCases: TestCaseDraft[];
  constraints: string;
  followUpQuestions: string;
  companyTags: string;
  topicTags: string;
  acceptanceRate: string;
  totalAttempts: string;
  totalSolves: string;
  explanation: string;
  isPremium: boolean;
  isActive: boolean;
};

const emptyCodeByLanguage = (): Record<LanguageKey, string> => ({
  javascript: '',
  python: '',
  cpp: '',
  java: '',
});

const defaultFormData = (): QuestionFormData => ({
  title: '',
  slug: '',
  description: '',
  problemStatement: '',
  difficulty: 'easy',
  type: 'CODING',
  skillId: '',
  starterCode: emptyCodeByLanguage(),
  solutionCode: emptyCodeByLanguage(),
  hints: '',
  testCases: [{ input: '', expectedOutput: '', isExample: true }],
  constraints: '',
  followUpQuestions: '',
  companyTags: '',
  topicTags: '',
  acceptanceRate: '0',
  totalAttempts: '0',
  totalSolves: '0',
  explanation: '',
  isPremium: false,
  isActive: true,
});

const arrayToText = (value: unknown) => Array.isArray(value) ? value.join('\n') : '';

const textToArray = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const codeMapFromQuestion = (value: unknown): Record<LanguageKey, string> => {
  const code = emptyCodeByLanguage();
  if (!value || typeof value !== 'object') return code;

  LANGUAGES.forEach((language) => {
    const languageCode = (value as Record<string, unknown>)[language];
    code[language] = typeof languageCode === 'string' ? languageCode : '';
  });

  return code;
};

const testCasesFromQuestion = (value: unknown): TestCaseDraft[] => {
  if (!Array.isArray(value)) {
    return [{ input: '', expectedOutput: '', isExample: true }];
  }

  const testCases = value.map((testCase) => ({
    input: typeof testCase?.input === 'string' ? testCase.input : '',
    expectedOutput:
      typeof testCase?.expectedOutput === 'string'
        ? testCase.expectedOutput
        : typeof testCase?.expected === 'string'
          ? testCase.expected
          : '',
    isExample: Boolean(testCase?.isExample),
  }));

  return testCases.length > 0 ? testCases : [{ input: '', expectedOutput: '', isExample: true }];
};

const pruneEmptyCode = (code: Record<LanguageKey, string>) => {
  const entries = Object.entries(code)
    .map(([language, value]) => [language, value.trim()] as const)
    .filter(([, value]) => value.length > 0);

  return Object.fromEntries(entries);
};

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function AdminQuestionForm({ question, onClose }: { question?: any, onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEditing = !!question;
  const [formData, setFormData] = useState<QuestionFormData>(() => defaultFormData());

  const { data: skills } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => adminApi.getSkills(),
  });

  useEffect(() => {
    if (!isEditing || !question) {
      setFormData(defaultFormData());
      return;
    }

    setFormData({
      title: question.title || '',
      slug: question.slug || '',
      description: question.description || '',
      problemStatement: question.problemStatement || '',
      difficulty: question.difficulty || 'easy',
      type: question.type || 'CODING',
      skillId: question.skillId || '',
      starterCode: codeMapFromQuestion(question.starterCode),
      solutionCode: codeMapFromQuestion(question.solutionCode),
      hints: arrayToText(question.hints),
      testCases: testCasesFromQuestion(question.testCases),
      constraints: arrayToText(question.constraints),
      followUpQuestions: arrayToText(question.followUpQuestions),
      companyTags: arrayToText(question.companyTags),
      topicTags: arrayToText(question.topicTags),
      acceptanceRate: String(question.acceptanceRate ?? 0),
      totalAttempts: String(question.totalAttempts ?? 0),
      totalSolves: String(question.totalSolves ?? 0),
      explanation: question.explanation || '',
      isPremium: Boolean(question.isPremium),
      isActive: question.isActive ?? true,
    });
  }, [isEditing, question]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing
      ? adminApi.updateQuestion(question.id, data)
      : adminApi.createQuestion(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Question updated' : 'Question created');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save question');
    }
  });

  const setField = <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const setCodeField = (
    group: 'starterCode' | 'solutionCode',
    language: LanguageKey,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [language]: value,
      },
    }));
  };

  const setTestCaseField = <K extends keyof TestCaseDraft>(
    index: number,
    field: K,
    value: TestCaseDraft[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      testCases: prev.testCases.map((testCase, testCaseIndex) =>
        testCaseIndex === index ? { ...testCase, [field]: value } : testCase
      ),
    }));
  };

  const addTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isExample: false }],
    }));
  };

  const removeTestCase = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, testCaseIndex) => testCaseIndex !== index),
    }));
  };

  const validateForm = () => {
    const requiredFields: Array<[keyof QuestionFormData, string]> = [
      ['skillId', 'Please select a skill category'],
      ['title', 'Title is required'],
      ['slug', 'Slug is required'],
      ['description', 'Short description is required'],
      ['problemStatement', 'Problem statement is required'],
      ['difficulty', 'Difficulty is required'],
      ['type', 'Question type is required'],
    ];

    for (const [field, message] of requiredFields) {
      if (!String(formData[field]).trim()) {
        toast.error(message);
        return false;
      }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      toast.error('Slug must use lowercase letters, numbers, and hyphens');
      return false;
    }

    if (formData.type === 'CODING' && !formData.starterCode.javascript.trim()) {
      toast.error('JavaScript starter code is required for coding questions');
      return false;
    }

    if (formData.type === 'CODING' && !formData.solutionCode.javascript.trim()) {
      toast.error('JavaScript solution code is required for coding questions');
      return false;
    }

    if (textToArray(formData.constraints).length === 0) {
      toast.error('At least one constraint is required');
      return false;
    }

    if (formData.testCases.length === 0) {
      toast.error('At least one test case is required');
      return false;
    }

    const invalidTestCaseIndex = formData.testCases.findIndex(
      (testCase) => !testCase.input.trim() || !testCase.expectedOutput.trim()
    );

    if (invalidTestCaseIndex >= 0) {
      toast.error(`Test case ${invalidTestCaseIndex + 1} needs input and expected output`);
      return false;
    }

    const acceptanceRate = toNumber(formData.acceptanceRate);
    if (acceptanceRate < 0 || acceptanceRate > 100) {
      toast.error('Acceptance rate must be between 0 and 100');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    skillId: formData.skillId,
    title: formData.title.trim(),
    slug: formData.slug.trim(),
    description: formData.description.trim(),
    problemStatement: formData.problemStatement.trim(),
    difficulty: formData.difficulty,
    type: formData.type,
    starterCode: pruneEmptyCode(formData.starterCode),
    solutionCode: pruneEmptyCode(formData.solutionCode),
    hints: textToArray(formData.hints),
    testCases: formData.testCases.map((testCase) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isExample: testCase.isExample,
    })),
    constraints: textToArray(formData.constraints),
    followUpQuestions: textToArray(formData.followUpQuestions),
    companyTags: textToArray(formData.companyTags),
    topicTags: textToArray(formData.topicTags),
    acceptanceRate: toNumber(formData.acceptanceRate),
    totalAttempts: Math.max(0, Math.trunc(toNumber(formData.totalAttempts))),
    totalSolves: Math.max(0, Math.trunc(toNumber(formData.totalSolves))),
    explanation: formData.explanation.trim() || null,
    isPremium: formData.isPremium,
    isActive: formData.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate(buildPayload());
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: !isEditing ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-card w-full max-w-5xl rounded-xl shadow-xl overflow-hidden animate-fade-in relative my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Edit Question' : 'Create New Question'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Basics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Title</span>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Valid Parentheses"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Slug</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setField('slug', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="valid-parentheses"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Difficulty</span>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setField('difficulty', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 capitalize"
                >
                  {DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Type</span>
                <select
                  value={formData.type}
                  onChange={(e) => setField('type', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Skill Category</span>
                <select
                  required
                  value={formData.skillId}
                  onChange={(e) => setField('skillId', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="" disabled>Select a skill</option>
                  {skills?.map((skill: any) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Short Description</span>
              <textarea
                required
                rows={2}
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                placeholder="Determine if the input string has valid parentheses."
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Problem Statement</span>
              <textarea
                required
                rows={6}
                value={formData.problemStatement}
                onChange={(e) => setField('problemStatement', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm resize-y"
                placeholder="<p>Given a string <code>s</code>...</p>"
              />
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Code</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {LANGUAGES.map((language) => (
                <div key={language} className="space-y-3 rounded-lg border p-4">
                  <h4 className="text-sm font-semibold capitalize">{language}</h4>
                  <label className="space-y-2 block">
                    <span className="text-xs font-medium text-muted-foreground">Starter Code</span>
                    <textarea
                      rows={7}
                      value={formData.starterCode[language]}
                      onChange={(e) => setCodeField('starterCode', language, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs resize-y"
                    />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-xs font-medium text-muted-foreground">Solution Code</span>
                    <textarea
                      rows={7}
                      value={formData.solutionCode[language]}
                      onChange={(e) => setCodeField('solutionCode', language, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs resize-y"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Test Cases</h3>
              <button
                type="button"
                onClick={addTestCase}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {formData.testCases.map((testCase, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">Case {index + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={testCase.isExample}
                          onChange={(e) => setTestCaseField(index, 'isExample', e.target.checked)}
                          className="rounded border"
                        />
                        Example
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTestCase(index)}
                        disabled={formData.testCases.length === 1}
                        className="p-2 text-red-600 hover:bg-muted rounded-lg transition-colors disabled:opacity-40"
                        aria-label={`Remove test case ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Input</span>
                      <textarea
                        rows={4}
                        value={testCase.input}
                        onChange={(e) => setTestCaseField(index, 'input', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs resize-y"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Expected Output</span>
                      <textarea
                        rows={4}
                        value={testCase.expectedOutput}
                        onChange={(e) => setTestCaseField(index, 'expectedOutput', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs resize-y"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Constraints</span>
                <textarea
                  rows={4}
                  value={formData.constraints}
                  onChange={(e) => setField('constraints', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  placeholder="1 <= s.length <= 10^4"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Hints</span>
                <textarea
                  rows={4}
                  value={formData.hints}
                  onChange={(e) => setField('hints', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  placeholder="Use a stack."
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Topic Tags</span>
                <textarea
                  rows={4}
                  value={formData.topicTags}
                  onChange={(e) => setField('topicTags', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  placeholder="stack&#10;string"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Company Tags</span>
                <textarea
                  rows={4}
                  value={formData.companyTags}
                  onChange={(e) => setField('companyTags', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  placeholder="Amazon&#10;Microsoft"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Follow-up Questions</span>
                <textarea
                  rows={3}
                  value={formData.followUpQuestions}
                  onChange={(e) => setField('followUpQuestions', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publishing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Acceptance Rate</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.acceptanceRate}
                  onChange={(e) => setField('acceptanceRate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Total Attempts</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.totalAttempts}
                  onChange={(e) => setField('totalAttempts', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Total Solves</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.totalSolves}
                  onChange={(e) => setField('totalSolves', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formData.isPremium}
                  onChange={(e) => setField('isPremium', e.target.checked)}
                  className="rounded border"
                />
                Premium
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                  className="rounded border"
                />
                Active
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Explanation</span>
              <textarea
                rows={5}
                value={formData.explanation}
                onChange={(e) => setField('explanation', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm resize-y"
                placeholder="<p>Use a stack to keep track of opening brackets.</p>"
              />
            </label>
          </section>

          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border bg-background hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
