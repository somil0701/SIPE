import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lightbulb,
  Loader2,
  Play,
  Send,
  Terminal,
  XCircle,
} from 'lucide-react'
import { questionsApi, attemptsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { initVimMode } from 'monaco-vim'

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
]

const SUPPORTED_LANGUAGE_IDS = LANGUAGES.map((language) => language.id)

const KNOWN_STARTERS: Record<string, Record<string, string>> = {
  'valid-palindrome': {
    javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');

// Print true if s is a valid palindrome, otherwise false.
`,
    python: `import sys

s = sys.stdin.read().rstrip("\\n")

# Print true if s is a valid palindrome, otherwise false.
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    getline(cin, s);

    // Print true if s is a valid palindrome, otherwise false.
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";

        // Print true if s is a valid palindrome, otherwise false.
    }
}
`,
  },
  'two-sum': {
    javascript: `const fs = require('fs');
const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
let idx = 0;
const n = data[idx++];
const nums = data.slice(idx, idx + n);
idx += n;
const target = data[idx];

// Print the two indices separated by a space.
`,
    python: `import sys

data = list(map(int, sys.stdin.read().strip().split()))
idx = 0
n = data[idx]
idx += 1
nums = data[idx:idx + n]
idx += n
target = data[idx]

# Print the two indices separated by a space.
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target;
    cin >> target;

    // Print the two indices separated by a space.
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();

        // Print the two indices separated by a space.
    }
}
`,
  },
  'best-time-to-buy-and-sell-stock': {
    javascript: `const fs = require('fs');
const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = data[0];
const prices = data.slice(1, 1 + n);

// Print the maximum profit.
`,
    python: `import sys

data = list(map(int, sys.stdin.read().strip().split()))
n = data[0]
prices = data[1:1 + n]

# Print the maximum profit.
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> prices(n);
    for (int i = 0; i < n; i++) cin >> prices[i];

    // Print the maximum profit.
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] prices = new int[n];
        for (int i = 0; i < n; i++) prices[i] = sc.nextInt();

        // Print the maximum profit.
    }
}
`,
  },
  'climbing-stairs': {
    javascript: `const fs = require('fs');
const n = Number(fs.readFileSync(0, 'utf8').trim());

// Print the number of distinct ways.
`,
    python: `import sys

n = int(sys.stdin.read().strip())

# Print the number of distinct ways.
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;

    // Print the number of distinct ways.
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        // Print the number of distinct ways.
    }
}
`,
  },
}

function getSupportedLanguage(language?: string) {
  return language && SUPPORTED_LANGUAGE_IDS.includes(language) ? language : 'javascript'
}

function isJudgeInProgress(status?: string) {
  return status === 'QUEUED' || status === 'PENDING' || status === 'RUNNING' || status === 'running'
}

function formatStatus(status?: string) {
  if (!status) return 'Unknown'
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function stringifyValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

function getTestCaseInput(testCase: any) {
  if (!testCase) return ''
  if (typeof testCase.input === 'string') return testCase.input
  if (Array.isArray(testCase.args)) {
    return testCase.args.map((value: unknown) => stringifyValue(value)).join('\n')
  }
  return stringifyValue(testCase.input)
}

function getTestCaseExpectedOutput(testCase: any) {
  if (!testCase) return ''
  if (testCase.expectedOutput !== undefined) return stringifyValue(testCase.expectedOutput)
  return stringifyValue(testCase.expected)
}

function getExampleInput(question: any) {
  const testCase = question?.testCases?.find((item: any) => item.isExample) ?? question?.testCases?.[0]
  return getTestCaseInput(testCase)
}

function getStarterCode(question: any, language: string) {
  const knownStarter = KNOWN_STARTERS[question?.slug]?.[language]
  if (knownStarter) return knownStarter

  const storedStarter = question?.starterCode?.[language]
  if (typeof storedStarter === 'string' && storedStarter.trim()) return storedStarter

  if (language === 'python') {
    return `import sys

data = sys.stdin.read()

# Write your solution here and print the answer.
`
  }

  if (language === 'cpp') {
    return `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here and print the answer.
    return 0;
}
`
  }

  if (language === 'java') {
    return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your solution here and print the answer.
    }
}
`
  }

  return `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');

// Write your solution here and print the answer.
`
}

function getConsoleText(runResult: any) {
  if (!runResult) return 'No output yet.'
  const output = runResult.output?.trim() || ''

  if (runResult.error) {
    return output ? `${runResult.error}\n\nstdout:\n${output}` : runResult.error
  }

  return output || '(no output)'
}

export function QuestionPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [language, setLanguage] = useState(getSupportedLanguage(user?.preferredLanguage))
  const [vimMode, setVimMode] = useState(() => {
    return localStorage.getItem('editor-vim-mode') === 'true'
  })
  const [code, setCode] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [runResult, setRunResult] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'description' | 'solution' | 'submissions'>('description')
  const [showHint, setShowHint] = useState<number | null>(null)
  const [latestAttemptId, setLatestAttemptId] = useState<string | null>(null)
  const startTime = useRef(Date.now())
  const editorRef = useRef<any>(null)
  const vimAdapterRef = useRef<any>(null)

  const { data: questionData, isLoading } = useQuery({
    queryKey: ['question', slug],
    queryFn: () => questionsApi.getBySlug(slug!),
  })

  const question = questionData

  const { data: latestAttempt, isFetching: isFetchingAttempt } = useQuery({
    queryKey: ['attempt', latestAttemptId],
    queryFn: () => attemptsApi.getById(latestAttemptId!),
    enabled: Boolean(latestAttemptId),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return isJudgeInProgress(status) ? 1000 : false
    },
  })

  // Populate starter code when question or language changes
  useEffect(() => {
    if (question) {
      setCode(getStarterCode(question, language))
    }
  }, [question, language])

  useEffect(() => {
    if (question) {
      setCustomInput(getExampleInput(question))
      setRunResult(null)
    }
  }, [question])

  useEffect(() => {
    localStorage.setItem('editor-vim-mode', String(vimMode))
    if (!editorRef.current) return
    
    if (vimMode) {
      const statusNode = document.getElementById('vim-status')
      if (statusNode) {
        statusNode.innerHTML = ''
      }
      vimAdapterRef.current = initVimMode(editorRef.current, statusNode)
    } else {
      if (vimAdapterRef.current) {
        vimAdapterRef.current.dispose()
        vimAdapterRef.current = null
      }
    }

    return () => {
      if (vimAdapterRef.current) {
        vimAdapterRef.current.dispose()
        vimAdapterRef.current = null
      }
    }
  }, [vimMode])

  const runMutation = useMutation({
    mutationFn: () =>
      attemptsApi.run({
        questionId: question!.id,
        code,
        language,
        input: customInput,
      }),
    onSuccess: (result: any) => {
      setRunResult(result)
      toast.success(result.status === 'ACCEPTED' ? 'Run completed.' : `Run finished: ${formatStatus(result.status)}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Run failed')
    },
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      attemptsApi.submit({
        questionId: question!.id,
        code,
        language,
        timeSpent: Math.floor((Date.now() - startTime.current) / 1000),
      }),
    onSuccess: (attempt: any) => {
      setLatestAttemptId(attempt.id)
      setActiveTab('submissions')
      toast.success('Solution submitted. Evaluating now.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Submission failed')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!question) {
    return <div className="text-center py-12">Question not found</div>
  }

  const latestAttemptRunning = isJudgeInProgress(latestAttempt?.status)
  const failedAttemptCase = latestAttempt?.attemptTestCases?.find((testCase: any) => !testCase.passed)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/practice')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Practice
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm difficulty-${question.difficulty}`}>
            {question.difficulty}
          </span>
          <span className="text-sm text-muted-foreground">
            {question.acceptanceRate}% acceptance
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - Problem Description */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex border-b">
            {(['description', 'solution', 'submissions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 max-h-[calc(100vh-300px)] overflow-auto">
            {activeTab === 'description' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">{question.title}</h1>
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.problemStatement }}
                />

                {question.testCases?.filter((testCase: any) => testCase.isExample).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Examples:</h3>
                    <div className="space-y-3">
                      {question.testCases
                        .filter((testCase: any) => testCase.isExample)
                        .map((testCase: any, index: number) => (
                          <div key={index} className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <p className="font-medium">Example {index + 1}</p>
                            <pre className="mt-2 overflow-auto rounded-md bg-background p-2 text-xs">
                              {`Input:\n${getTestCaseInput(testCase)}\n\nOutput:\n${getTestCaseExpectedOutput(testCase)}`}
                            </pre>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {question.constraints?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Constraints:</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {question.constraints.map((constraint: string, i: number) => (
                        <li key={i}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.hints?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Hints
                    </h3>
                    <div className="space-y-2">
                      {question.hints.map((hint: string, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border cursor-pointer hover:bg-muted"
                          onClick={() => setShowHint(showHint === i ? null : i)}
                        >
                          <p className="text-sm font-medium">Hint {i + 1}</p>
                          {showHint === i && (
                            <p className="text-sm text-muted-foreground mt-1">{hint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'solution' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Solution</h2>
                {question.explanation ? (
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: question.explanation }}
                  />
                ) : (
                  <p className="text-muted-foreground">Solution not available yet.</p>
                )}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Submissions</h2>
                {!latestAttemptId ? (
                  <p className="text-muted-foreground">
                    Submit a solution to see its evaluation here.
                  </p>
                ) : isFetchingAttempt && !latestAttempt ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading submission result...
                  </div>
                ) : latestAttempt ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Latest submission</p>
                          <div className="flex items-center gap-2">
                            {latestAttemptRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : latestAttempt.status === 'ACCEPTED' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <p className="font-semibold">{formatStatus(latestAttempt.status)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Tests</p>
                          <p className="font-semibold">
                            {latestAttempt.testCasesPassed} / {latestAttempt.testCasesTotal}
                          </p>
                        </div>
                      </div>
                      {latestAttempt.executionTime !== null && latestAttempt.executionTime !== undefined && (
                        <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                          Execution time: {latestAttempt.executionTime} ms
                        </div>
                      )}
                      {failedAttemptCase?.errorMessage && (
                        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-red-950/10 p-3 text-xs text-red-700 dark:text-red-300">
                          {failedAttemptCase.errorMessage}
                        </pre>
                      )}
                      {latestAttempt.aiScore !== null && latestAttempt.aiScore !== undefined && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-sm text-muted-foreground">AI score</p>
                          <p className="text-2xl font-bold">{latestAttempt.aiScore}</p>
                        </div>
                      )}
                    </div>

                    {latestAttempt.attemptTestCases?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Test cases</h3>
                        {latestAttempt.attemptTestCases.map((testCase: any) => (
                          <div key={testCase.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 font-medium">
                                {testCase.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                Test {testCase.testCaseIndex + 1}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {testCase.executionTime ?? 0} ms
                              </span>
                            </div>
                            {!testCase.passed && (
                              <div className="mt-3 grid grid-cols-1 gap-2">
                                <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                                  {`Expected:\n${testCase.expectedOutput}`}
                                </pre>
                                <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                                  {`Actual:\n${testCase.actualOutput || ''}`}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {latestAttempt.feedback ? (
                      <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-2">Feedback</h3>
                        <p className="text-sm text-muted-foreground">
                          {latestAttempt.feedback.summary || 'Feedback generated.'}
                        </p>
                        {latestAttempt.feedback.improvementSuggestions?.length > 0 && (
                          <ul className="mt-3 list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {latestAttempt.feedback.improvementSuggestions
                              .slice(0, 3)
                              .map((suggestion: string, index: number) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {latestAttemptRunning ? 'Judge is running...' : 'Feedback is still being generated...'}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Submission result unavailable.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => {
                  const nextLanguage = e.target.value
                  setLanguage(nextLanguage)
                  setRunResult(null)
                  setCode(getStarterCode(question, nextLanguage))
                }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={vimMode}
                  onChange={(e) => setVimMode(e.target.checked)}
                  className="rounded border-input bg-background"
                />
                Vim Mode
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {Math.floor((Date.now() - startTime.current) / 60000)}m{' '}
              {Math.floor(((Date.now() - startTime.current) % 60000) / 1000)}s
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 min-h-[400px]">
            <Editor
              height="100%"
              language={language}
              value={code}
              onMount={(editor) => {
                editorRef.current = editor
                if (vimMode) {
                  const statusNode = document.getElementById('vim-status')
                  if (statusNode) {
                    statusNode.innerHTML = ''
                  }
                  vimAdapterRef.current = initVimMode(editor, statusNode)
                }
              }}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t">
            <div className="border-b md:border-b-0 md:border-r">
              <div className="flex h-10 items-center justify-between border-b px-3">
                <span className="text-sm font-medium">Custom Input</span>
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="h-36 w-full resize-none bg-background p-3 font-mono text-sm outline-none"
                spellCheck={false}
              />
            </div>
            <div>
              <div className="flex h-10 items-center justify-between border-b px-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="h-4 w-4" />
                  Output
                </div>
                {runResult && (
                  <span className="text-xs text-muted-foreground">
                    {formatStatus(runResult.status)} · {runResult.executionTime} ms
                  </span>
                )}
              </div>
              <pre className="h-36 overflow-auto whitespace-pre-wrap bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                {getConsoleText(runResult)}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t flex items-center">
            <div id="vim-status" className="text-xs font-mono text-muted-foreground ml-2"></div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || !code.trim()}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {runMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Code
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !code.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
