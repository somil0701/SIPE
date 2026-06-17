import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Code2,
  Keyboard,
  Lightbulb,
  Loader2,
  Play,
  Send,
  Terminal,
  XCircle,
} from 'lucide-react'
import { questionsApi, attemptsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { initVimMode } from 'monaco-vim'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

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

type TimelineAttempt = {
  id: string
  attemptNumber: number
  status: string
  language: string
  code: string | null
  timeSpent: number
  executionTime: number | null
  testCasesPassed: number
  testCasesTotal: number
  aiScore: number | null
  submittedAt: string
  feedback: {
    summary: string | null
    approachUsed?: string | null
    codeQualityScore: number | null
    codeQualityFeedback: string | null
    timeComplexityActual: string | null
    spaceComplexityActual: string | null
    strengths: string[]
    weaknesses: string[]
    improvementSuggestions: string[]
  } | null
  failedTestCases: Array<{
    id: string
    testCaseIndex: number
    input: string
    expectedOutput: string
    actualOutput: string | null
    errorMessage: string | null
    executionTime: number | null
  }>
}

type SubmissionTimeline = {
  summary: {
    totalAttempts: number
    accepted: boolean
    bestScore: number | null
    bestStatus: string | null
    latestStatus: string | null
    latestSubmittedAt: string | null
    firstAcceptedAt: string | null
    languagesUsed: string[]
    averageTimeSpent: number | null
  }
  mistakeMemory: Array<{
    type: 'status' | 'test_case' | 'weakness'
    label: string
    count: number
    lastSeenAt: string
    suggestion: string
    evidence: string[]
  }>
  attempts: TimelineAttempt[]
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '0s'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
  }

  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not yet'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusTone(status?: string) {
  if (isJudgeInProgress(status)) return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
  if (status === 'ACCEPTED') return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300'
  return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
}

function latestFailedCase(attempt?: TimelineAttempt) {
  return attempt?.failedTestCases?.[0]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function QuestionPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const appTheme = useThemeStore((s) => s.theme)
  const editorTheme = appTheme === 'dark' || (appTheme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'custom-dark' : 'light'
  const [language, setLanguage] = useState(getSupportedLanguage(user?.preferredLanguage))
  const [vimMode, setVimMode] = useState(() => {
    return localStorage.getItem('editor-vim-mode') === 'true'
  })
  const [code, setCode] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [runResult, setRunResult] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'description' | 'solution' | 'submissions'>('description')
  const [showHint, setShowHint] = useState<number | null>(null)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [isMistakeMemoryOpen, setIsMistakeMemoryOpen] = useState(false)
  const [openSolutionLanguages, setOpenSolutionLanguages] = useState<Record<string, boolean>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [splitPercent, setSplitPercent] = useState(() => {
    const stored = Number(localStorage.getItem('practice-split-percent'))
    return Number.isFinite(stored) ? clamp(stored, 35, 65) : 48
  })
  const [verticalSplitPercent, setVerticalSplitPercent] = useState(() => {
    const stored = Number(localStorage.getItem('practice-vertical-split-percent'))
    return Number.isFinite(stored) ? clamp(stored, 20, 80) : 65
  })
  const [isCodeDirty, setIsCodeDirty] = useState(false)
  const startTime = useRef(Date.now())
  const codeBaselineRef = useRef('')
  const suppressStarterResetRef = useRef(false)
  const runActionRef = useRef<() => void>(() => { })
  const submitActionRef = useRef<() => void>(() => { })
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const verticalContainerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const vimAdapterRef = useRef<any>(null)

  const {
    data: questionData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['question', slug],
    queryFn: () => questionsApi.getBySlug(slug!),
    enabled: Boolean(slug),
  })

  const question = questionData

  const { data: submissionTimeline, isFetching: isFetchingTimeline } = useQuery<SubmissionTimeline>({
    queryKey: ['submission-timeline', question?.id],
    queryFn: () => attemptsApi.getQuestionTimeline(question!.id),
    enabled: Boolean(question?.id),
    refetchInterval: (query) => {
      const attempts = (query.state.data as SubmissionTimeline | undefined)?.attempts ?? []
      return attempts.some((attempt) => isJudgeInProgress(attempt.status)) ? 1000 : false
    },
  })

  const ignoreEditsRef = useRef(false)
  const isViewingSubmissionCodeRef = useRef(false)

  const updateCode = useCallback((nextCode: string) => {
    setCode(nextCode)
    setIsCodeDirty(nextCode !== codeBaselineRef.current)
  }, [])

  const replaceCode = useCallback((nextCode: string) => {
    ignoreEditsRef.current = true
    codeBaselineRef.current = nextCode
    setCode(nextCode)
    setIsCodeDirty(false)
    setTimeout(() => {
      ignoreEditsRef.current = false
    }, 100)
  }, [])

  const canReplaceCode = useCallback((message: string) => {
    if (!isCodeDirty) return true
    return window.confirm(message)
  }, [isCodeDirty])

  const handleTabChange = useCallback((tab: 'description' | 'solution' | 'submissions') => {
    if (activeTab === 'submissions' && tab !== 'submissions') {
      ignoreEditsRef.current = true
      setTimeout(() => { ignoreEditsRef.current = false }, 100)
    }
    setActiveTab(tab)
  }, [activeTab])

  // Populate starter code when question or language changes
  useEffect(() => {
    if (question) {
      if (suppressStarterResetRef.current) {
        suppressStarterResetRef.current = false
        return
      }

      replaceCode(getStarterCode(question, language))
    }
  }, [question, language, replaceCode])

  useEffect(() => {
    if (question) {
      setCustomInput(getExampleInput(question))
      setRunResult(null)
    }
  }, [question])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('practice-split-percent', String(splitPercent))
  }, [splitPercent])

  useEffect(() => {
    localStorage.setItem('practice-vertical-split-percent', String(verticalSplitPercent))
  }, [verticalSplitPercent])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (event.buttons === 0) return

      if (splitContainerRef.current?.dataset.dragging) {
        const bounds = splitContainerRef.current.getBoundingClientRect()
        const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100
        setSplitPercent(clamp(nextPercent, 35, 65))
      }

      if (verticalContainerRef.current?.dataset.dragging) {
        const bounds = verticalContainerRef.current.getBoundingClientRect()
        const nextPercent = ((event.clientY - bounds.top) / bounds.height) * 100
        setVerticalSplitPercent(clamp(nextPercent, 20, 80))
      }
    }

    const stopDragging = () => {
      if (splitContainerRef.current) {
        delete splitContainerRef.current.dataset.dragging
      }
      if (verticalContainerRef.current) {
        delete verticalContainerRef.current.dataset.dragging
      }
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    if (!submissionTimeline?.attempts.length) {
      setSelectedAttemptId(null)
      return
    }

    setSelectedAttemptId((current) => {
      if (current && submissionTimeline.attempts.some((attempt) => attempt.id === current)) {
        return current
      }

      return null
    })
  }, [submissionTimeline])

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
      setSelectedAttemptId(attempt.id)
      setActiveTab('submissions')
      queryClient.invalidateQueries({ queryKey: ['submission-timeline', question!.id] })
      toast.success('Solution submitted. Judge is evaluating now.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Submission failed')
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: (attemptId: string) => attemptsApi.generateFeedback(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission-timeline', question!.id] })
      toast.success('AI review generated.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to generate AI review')
    },
  })

  const handleRun = useCallback(() => {
    if (!question || !code.trim() || runMutation.isPending) return
    runMutation.mutate()
  }, [code, question, runMutation])

  const handleSubmit = useCallback(() => {
    if (!question || !code.trim() || submitMutation.isPending) return
    submitMutation.mutate()
  }, [code, question, submitMutation])

  useEffect(() => {
    runActionRef.current = handleRun
    submitActionRef.current = handleSubmit
  }, [handleRun, handleSubmit])

  const handleLanguageChange = useCallback((nextLanguage: string) => {
    if (nextLanguage === language) return
    if (!canReplaceCode('Changing language will replace the current editor contents with starter code. Continue?')) {
      return
    }

    setLanguage(nextLanguage)
    setRunResult(null)
  }, [canReplaceCode, language])

  const handleLoadAttemptCode = useCallback((attempt: TimelineAttempt) => {
    if (!attempt.code) return
    if (!canReplaceCode('Loading this attempt will replace your unsaved editor changes. Continue?')) {
      return
    }

    const nextLanguage = getSupportedLanguage(attempt.language)
    if (nextLanguage !== language) {
      suppressStarterResetRef.current = true
      setLanguage(nextLanguage)
    }

    replaceCode(attempt.code)
    setRunResult(null)
    handleTabChange('description')
    toast.success('Loaded this attempt into the editor.')
  }, [canReplaceCode, language, replaceCode, handleTabChange])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey
      const isRunShortcut = hasModifier && (event.key === "'" || event.code === 'Quote') && !event.shiftKey
      const isSubmitShortcut = hasModifier && event.key === 'Enter' && !event.shiftKey

      if (!isRunShortcut && !isSubmitShortcut) return

      event.preventDefault()
      if (isSubmitShortcut) {
        handleSubmit()
      } else {
        handleRun()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRun, handleSubmit])

  if (isLoading) {
    return <LoadingState message="Loading question..." bordered />
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load question"
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Retry
          </button>
        }
      />
    )
  }

  if (!question) {
    return (
      <EmptyState
        title="Question not found"
        message="The question may have been removed or the link may be incorrect."
        action={
          <button
            type="button"
            onClick={() => navigate('/practice')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to Practice
          </button>
        }
      />
    )
  }

  const timelineAttempts = submissionTimeline?.attempts ?? []
  const selectedAttempt = timelineAttempts.find((attempt) => attempt.id === selectedAttemptId)
  const selectedAttemptRunning = isJudgeInProgress(selectedAttempt?.status)
  const failedAttemptCase = latestFailedCase(selectedAttempt)

  const isViewingSubmissionCode = activeTab === 'submissions' && !!selectedAttempt?.code;
  const displayCode = isViewingSubmissionCode ? selectedAttempt.code! : code;
  const displayLanguage = isViewingSubmissionCode ? getSupportedLanguage(selectedAttempt.language) : language;
  isViewingSubmissionCodeRef.current = isViewingSubmissionCode;

  return (
    <div className="space-y-4 -mt-2 sm:-mt-3">
      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 pt-1 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-2 flex items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate text-lg font-semibold sm:text-xl">{question.title}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize difficulty-${question.difficulty}`}>
                {question.difficulty}
              </span>
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                {question.acceptanceRate}% acceptance
              </span>
              {isCodeDirty && !isViewingSubmissionCode && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Unsaved edits
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end xl:gap-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono tabular-nums">{formatClock(elapsedSeconds)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={handleRun}
                disabled={runMutation.isPending || !code.trim()}
                title="Run (Ctrl/⌘+')"
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {runMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !code.trim()}
                title="Submit (Ctrl/⌘+Enter)"
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <div
        ref={splitContainerRef}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[var(--practice-grid)] lg:h-[calc(100vh-141px)]"
        style={{ '--practice-grid': `${splitPercent}% 4px minmax(0, 1fr)` } as any}
      >
        {/* Left Panel - Problem Description */}
        <div className="flex flex-col overflow-hidden rounded-lg border bg-card flex-1">
          <div className="flex-none flex border-b" role="tablist" aria-label="Question details">
            {(['description', 'solution', 'submissions'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => handleTabChange(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`flex-1 px-4 py-3 text-sm font-medium capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
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
                        <button
                          type="button"
                          key={i}
                          className="w-full p-3 rounded-lg border text-left hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={() => setShowHint(showHint === i ? null : i)}
                          aria-expanded={showHint === i}
                        >
                          <p className="text-sm font-medium">Hint {i + 1}</p>
                          {showHint === i && (
                            <p className="text-sm text-muted-foreground mt-1">{hint}</p>
                          )}
                        </button>
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

                {Object.entries(question.solutionCode ?? {})
                  .filter(([, solution]) => typeof solution === 'string' && solution.trim())
                  .length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <h3 className="font-semibold">Reference Code</h3>
                      <p className="text-sm text-muted-foreground">
                        Expand a language when you want to compare against the official solution.
                      </p>
                    </div>
                    {Object.entries(question.solutionCode ?? {})
                      .filter(([, solution]) => typeof solution === 'string' && solution.trim())
                      .map(([solutionLanguage, solution]) => {
                        const isOpen = Boolean(openSolutionLanguages[solutionLanguage])
                        const languageName = LANGUAGES.find((lang) => lang.id === solutionLanguage)?.name ?? solutionLanguage

                        return (
                          <div key={solutionLanguage} className="overflow-hidden rounded-lg border">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenSolutionLanguages((current) => ({
                                  ...current,
                                  [solutionLanguage]: !current[solutionLanguage],
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                              aria-expanded={isOpen}
                            >
                              <div className="flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{languageName}</span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''
                                  }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="max-h-[32rem] overflow-auto border-t bg-zinc-950 text-xs">
                                <SyntaxHighlighter
                                  language={solutionLanguage}
                                  style={vscDarkPlus}
                                  customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                >
                                  {solution as string}
                                </SyntaxHighlighter>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    No reference code has been added for this question yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Submission Timeline</h2>
                    <p className="text-sm text-muted-foreground">
                      Track progress, recurring mistakes, and previous code for this problem.
                    </p>
                  </div>
                  {isFetchingTimeline && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {isFetchingTimeline && !submissionTimeline ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading submission timeline...
                  </div>
                ) : timelineAttempts.length === 0 ? (
                  <p className="text-muted-foreground">
                    Submit a solution to build your timeline and mistake memory.
                  </p>
                ) : submissionTimeline ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Attempts</p>
                        <p className="text-2xl font-bold">{submissionTimeline.summary.totalAttempts}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Latest</p>
                        <p className="text-sm font-semibold">{formatStatus(submissionTimeline.summary.latestStatus || undefined)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Best review score</p>
                        <p className="text-2xl font-bold">{submissionTimeline.summary.bestScore ?? '-'}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Avg time</p>
                        <p className="text-sm font-semibold">{formatDuration(submissionTimeline.summary.averageTimeSpent)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setIsMistakeMemoryOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        aria-expanded={isMistakeMemoryOpen}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Brain className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <h3 className="font-semibold">Mistake Memory</h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {submissionTimeline.mistakeMemory.length > 0
                                ? `${submissionTimeline.mistakeMemory.length} pattern${submissionTimeline.mistakeMemory.length === 1 ? '' : 's'} found · ${submissionTimeline.mistakeMemory[0].label}`
                                : 'No repeated mistake pattern yet'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isMistakeMemoryOpen ? 'rotate-180' : ''
                            }`}
                        />
                      </button>

                      {isMistakeMemoryOpen && (
                        <div className="border-t p-4">
                          {submissionTimeline.mistakeMemory.length > 0 ? (
                            <div className="max-h-96 space-y-3 overflow-auto pr-1">
                              {submissionTimeline.mistakeMemory.map((item) => (
                                <div key={`${item.type}-${item.label}`} className="rounded-lg bg-muted/40 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-medium">{item.label}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Seen {item.count} time{item.count === 1 ? '' : 's'} · Last seen {formatDateTime(item.lastSeenAt)}
                                      </p>
                                    </div>
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">{item.suggestion}</p>
                                  {item.evidence.length > 0 && (
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                      {item.evidence.map((evidence, index) => (
                                        <li key={index}>{evidence}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              A couple more submissions will make this smarter.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">History</h3>
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[800px] pr-2 scrollbar-thin scrollbar-thumb-border">
                          {timelineAttempts.map((attempt) => {
                            const isSelected = selectedAttempt?.id === attempt.id;

                            return (
                              <div
                                key={attempt.id}
                                className={`w-full shrink-0 rounded-xl border transition-all duration-200 overflow-hidden ${isSelected ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'bg-card hover:bg-muted/30 hover:border-primary/50'
                                  }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttemptId(isSelected ? null : attempt.id)}
                                  className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2.5">
                                      {isJudgeInProgress(attempt.status) ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      ) : attempt.status === 'ACCEPTED' ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      )}
                                      <span className="text-sm font-semibold">Attempt {attempt.attemptNumber}</span>
                                    </div>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusTone(attempt.status)}`}>
                                      {formatStatus(attempt.status)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Code2 className="h-3.5 w-3.5" />
                                      <span>{LANGUAGES.find(l => l.id === attempt.language)?.name || attempt.language}</span>
                                    </div>
                                    <span>{attempt.testCasesPassed}/{attempt.testCasesTotal} passed</span>
                                    <span className="ml-auto">{formatDateTime(attempt.submittedAt)}</span>
                                  </div>
                                </button>

                                {isSelected && (
                                  <div className="p-5 border-t border-primary/10 bg-background/50">
                                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-4">
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Tests</p>
                                        <p className="font-medium">{attempt.testCasesPassed} <span className="text-muted-foreground">/ {attempt.testCasesTotal}</span></p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Runtime</p>
                                        <p className="font-medium">{attempt.executionTime ?? 0} <span className="text-muted-foreground">ms</span></p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Review</p>
                                        <p className="font-medium">{attempt.aiScore ?? '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                                        <p className="font-medium">{formatDateTime(attempt.submittedAt)}</p>
                                      </div>
                                    </div>



                                    {attempt.feedback ? (
                                      <div className="mt-5 border-t pt-5">
                                        <div className="flex items-center justify-between gap-3">
                                          <h4 className="font-semibold">AI Review</h4>
                                          {attempt.feedback.codeQualityScore !== null && (
                                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                              Quality {attempt.feedback.codeQualityScore}/100
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                          {attempt.feedback.summary || 'Feedback generated.'}
                                        </p>
                                        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                          <div className="rounded-lg border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Approach</p>
                                            <p className="mt-1 font-medium">
                                              {attempt.feedback.approachUsed || 'Not identified'}
                                            </p>
                                          </div>
                                          <div className="rounded-lg border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Time Complexity</p>
                                            <p className="mt-1 font-medium">
                                              {attempt.feedback.timeComplexityActual || 'Unknown'}
                                            </p>
                                          </div>
                                          <div className="rounded-lg border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Space Complexity</p>
                                            <p className="mt-1 font-medium">
                                              {attempt.feedback.spaceComplexityActual || 'Unknown'}
                                            </p>
                                          </div>
                                        </div>
                                        {attempt.feedback.codeQualityFeedback && (
                                          <p className="mt-3 text-sm text-muted-foreground">
                                            {attempt.feedback.codeQualityFeedback}
                                          </p>
                                        )}
                                        {attempt.feedback.improvementSuggestions?.length > 0 && (
                                          <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            {attempt.feedback.improvementSuggestions.slice(0, 3).map((suggestion, index) => (
                                              <li key={index}>{suggestion}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-5 flex items-center gap-2 border-t pt-5 text-muted-foreground">
                                        {selectedAttemptRunning ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Judge is running...
                                          </>
                                        ) : (
                                          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2">
                                              <Brain className="h-4 w-4 text-primary" />
                                              <span className="text-sm">Generate AI review for approach, complexity, and improvement notes.</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                feedbackMutation.mutate(attempt.id);
                                              }}
                                              disabled={feedbackMutation.isPending}
                                              className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                              {feedbackMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Brain className="h-4 w-4" />
                                              )}
                                              Generate AI Review
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Submission timeline unavailable.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="hidden group cursor-col-resize items-center justify-center lg:flex focus:outline-none"
          aria-label="Resize problem and editor panels"
          onPointerDown={(event) => {
            event.preventDefault()
            if (splitContainerRef.current) {
              splitContainerRef.current.dataset.dragging = 'true'
            }
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        >
          <div className="h-24 w-1 rounded-full bg-border transition-colors group-hover:bg-primary group-data-[dragging]:bg-primary" />
        </button>

        {/* Right Panel - Code Editor */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card flex-1">
          {/* Editor Toolbar */}
          {isViewingSubmissionCode ? (
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Viewing Attempt {selectedAttempt?.attemptNumber} ({LANGUAGES.find(l => l.id === selectedAttempt?.language)?.name || selectedAttempt?.language})</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Read-only</span>
              </div>
              <button
                type="button"
                onClick={() => handleLoadAttemptCode(selectedAttempt)}
                className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
              >
                <Code2 className="h-4 w-4" />
                Load into Editor
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-3 border-b sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <select
                  value={displayLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Programming language"
                  disabled={isViewingSubmissionCode}
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
                    className="rounded border-input bg-background focus:ring-2 focus:ring-ring"
                  />
                  Vim Mode
                </label>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Use Ctrl/⌘+' to run</span>
                <span className="md:hidden">Shortcuts enabled</span>
              </div>
            </div>
          )}

          {/* Vertical Container */}
          <div
            ref={verticalContainerRef}
            className="flex-1 flex flex-col min-h-0"
            style={!isViewingSubmissionCode ? { display: 'grid', gridTemplateRows: `${verticalSplitPercent}% 4px minmax(0, 1fr)` } : undefined}
          >
            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                language={displayLanguage}
                value={displayCode}
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme('custom-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#0B1120',
                      'editorGutter.background': '#111827',
                    },
                  })
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    submitActionRef.current()
                  })

                  const quoteKeyCode = (monaco.KeyCode as any).Quote ?? (monaco.KeyCode as any).US_QUOTE
                  if (quoteKeyCode) {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | quoteKeyCode, () => {
                      runActionRef.current()
                    })
                  }

                  if (vimMode) {
                    const statusNode = document.getElementById('vim-status')
                    if (statusNode) {
                      statusNode.innerHTML = ''
                    }
                    vimAdapterRef.current = initVimMode(editor, statusNode)
                  }
                }}
                onChange={(value) => {
                  if (ignoreEditsRef.current || isViewingSubmissionCodeRef.current) return
                  updateCode(value || '')
                }}
                theme={editorTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: isViewingSubmissionCode,
                  automaticLayout: true,
                }}
              />
            </div>

            {!isViewingSubmissionCode && (
              <div
                className="w-full h-1 cursor-row-resize flex items-center justify-center hover:bg-primary/20 active:bg-primary transition-colors relative z-10 group"
                onPointerDown={(event) => {
                  event.preventDefault()
                  if (verticalContainerRef.current) {
                    verticalContainerRef.current.dataset.dragging = 'true'
                  }
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
              >
                <div className="h-0.5 w-8 rounded-full bg-border group-hover:bg-primary/50 group-active:bg-primary" />
              </div>
            )}

            {!isViewingSubmissionCode && (
              <div className="flex flex-col min-h-0 bg-background border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
                  <div className="border-b md:border-b-0 md:border-r flex flex-col min-h-0">
                    <div className="flex h-10 flex-none items-center justify-between border-b px-3">
                      <span className="text-sm font-medium">Custom Input</span>
                      <span className="text-xs text-muted-foreground">Run only</span>
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="flex-1 w-full resize-none bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                      spellCheck={false}
                      aria-label="Custom input"
                    />
                  </div>
                  <div className="flex flex-col min-h-0">
                    <div className="flex h-10 flex-none items-center justify-between gap-2 border-b px-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Terminal className="h-4 w-4" />
                        Run Result
                      </div>
                      {runResult && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(runResult.status)}`}>
                          {formatStatus(runResult.status)} · {runResult.executionTime} ms
                        </span>
                      )}
                    </div>
                    <pre
                      className="flex-1 overflow-auto whitespace-pre-wrap bg-zinc-950 p-3 font-mono text-sm text-zinc-100 min-h-0"
                      aria-live="polite"
                    >
                      {getConsoleText(runResult)}
                    </pre>
                  </div>
                </div>
                <div className="p-2 border-t flex items-center min-h-[36px] flex-none">
                  <div id="vim-status" className="text-xs font-mono text-muted-foreground ml-2"></div>
                </div>
              </div>
            )}
          </div>

          {isViewingSubmissionCode && selectedAttempt && (
            <div className="border-t bg-muted/5 p-4 flex-none border-b sm:border-b-0">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Submission Output</span>
                <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${statusTone(selectedAttempt.status)}`}>
                  {formatStatus(selectedAttempt.status)}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{selectedAttempt.executionTime ?? 0} ms</span>
              </div>

              {failedAttemptCase ? (
                <div className="space-y-3">
                  {failedAttemptCase.errorMessage && (
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-red-950/10 p-3 text-xs text-red-700 dark:text-red-300">
                      {failedAttemptCase.errorMessage}
                    </pre>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Input</p>
                      <pre className="max-h-24 overflow-auto rounded-md bg-muted p-2 text-xs">
                        {failedAttemptCase.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Output</p>
                      <pre className="max-h-24 overflow-auto rounded-md bg-muted p-2 text-xs">
                        {`Expected:\n${failedAttemptCase.expectedOutput}\n\nActual:\n${failedAttemptCase.actualOutput || ''}`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    All {selectedAttempt.testCasesTotal} test cases passed
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
