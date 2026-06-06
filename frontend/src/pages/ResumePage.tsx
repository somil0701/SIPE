import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileText,
  Gauge,
  Lightbulb,
  Loader2,
  SearchCheck,
  Sparkles,
  Target,
  Upload,
} from 'lucide-react'
import { resumeApi } from '../services/api'
import {
  ExperienceAnalysis,
  JobMatchAnalysis,
  ProjectAnalysis,
  ResumeReviewAnalysis,
  ScoreFactor,
  SkillCategoryKey,
} from '../types'
import { ReviewCard, BadgeList } from '../components/resume/ReviewCard'
import { ScoreRing } from '../components/resume/ScoreRing'

const skillCategoryLabels: Record<SkillCategoryKey, string> = {
  programmingLanguages: 'Programming Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  databases: 'Databases',
  devOps: 'DevOps',
  cloud: 'Cloud',
  aiMl: 'AI/ML',
  other: 'Other',
}

const priorityClasses = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
}

export function ResumePage() {
  const [isDragging, setIsDragging] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [jobMatch, setJobMatch] = useState<JobMatchAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume'],
    queryFn: () => resumeApi.getCurrent(),
    refetchInterval: (query) => {
      const status = query.state.data?.parsingStatus
      return status === 'processing' || status === 'PENDING' ? 2500 : false
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file),
    onSuccess: () => {
      setJobMatch(null)
      toast.success('Resume uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['resume'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Upload failed')
    },
  })

  const jobMatchMutation = useMutation({
    mutationFn: () => resumeApi.matchJobDescription(jobDescription.trim()),
    onSuccess: (analysis) => setJobMatch(analysis),
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Unable to match job description')
    },
  })

  const review = resume?.parsedData?.review
  const isProcessing = resume?.parsingStatus === 'processing' || resume?.parsingStatus === 'PENDING'
  const canMatchJob = resume?.parsingStatus === 'completed' && Boolean(review)

  const fileAccept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  const handleFile = (file?: File) => {
    if (!file) return
    const isAllowed =
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|docx)$/i.test(file.name)

    if (!isAllowed) {
      toast.error('Upload a PDF or DOCX resume')
      return
    }

    uploadMutation.mutate(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Resume Review</h1>
          <p className="mt-1 text-muted-foreground">
            ATS scoring, section analysis, project feedback, and role matching.
          </p>
        </div>
        {resume && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Upload New
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!resume && !isLoading && (
        <UploadPanel
          isDragging={isDragging}
          isUploading={uploadMutation.isPending}
          onBrowse={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        />
      )}

      {resume && (
        <ResumeStatusCard
          fileName={resume.fileName}
          status={resume.parsingStatus}
          error={resume.parsingError}
          generatedBy={review?.generatedBy}
        />
      )}

      {isLoading && <DashboardSkeleton />}

      {isProcessing && <ProcessingState />}

      {resume?.parsingStatus === 'failed' && (
        <ReviewCard title="Parsing Issue" icon={AlertCircle}>
          <p className="text-sm text-muted-foreground">
            {resume.parsingError || 'The resume could not be parsed. Try a text-based PDF or DOCX export.'}
          </p>
        </ReviewCard>
      )}

      {review && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ATSOverview review={review} />
            <JobMatchCard
              jobDescription={jobDescription}
              jobMatch={jobMatch}
              isPending={jobMatchMutation.isPending}
              canMatch={canMatchJob}
              onChange={setJobDescription}
              onAnalyze={() => jobMatchMutation.mutate()}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InsightPanel
              title="Strengths"
              icon={CheckCircle2}
              items={review.strengths}
              emptyLabel="No strengths detected yet."
              tone="success"
            />
            <InsightPanel
              title="Weaknesses"
              icon={AlertCircle}
              items={review.weaknesses}
              emptyLabel="No major weaknesses detected."
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SkillAnalysisCard review={review} />
            <PriorityImprovementsCard review={review} />
          </div>

          <ProjectAnalysisCard projects={review.projectAnalysis} />
          <ExperienceAnalysisCard experiences={review.experienceAnalysis} />
        </>
      )}

      {resume?.parsedData && !review && resume.parsingStatus === 'completed' && (
        <LegacyParsedResume parsedData={resume.parsedData} />
      )}
    </div>
  )
}

function UploadPanel({
  isDragging,
  isUploading,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  isDragging: boolean;
  isUploading: boolean;
  onBrowse: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}) {
  return (
    <button
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onBrowse}
      className={`w-full rounded-xl border-2 border-dashed bg-card p-12 text-center shadow-sm transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Upload resume</h2>
      <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, up to the configured file size limit</p>
      {isUploading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}
    </button>
  )
}

function ResumeStatusCard({
  fileName,
  status,
  error,
  generatedBy,
}: {
  fileName: string;
  status: string;
  error?: string;
  generatedBy?: string;
}) {
  const statusContent =
    status === 'completed'
      ? { icon: CheckCircle2, label: 'Review ready', className: 'text-green-600' }
      : status === 'processing' || status === 'PENDING'
        ? { icon: Loader2, label: 'Analyzing resume', className: 'text-muted-foreground animate-spin' }
        : { icon: AlertCircle, label: 'Parsing failed', className: 'text-red-600' }
  const StatusIcon = statusContent.icon

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">{fileName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <StatusIcon className={`h-4 w-4 ${statusContent.className}`} />
              <span className={status === 'failed' ? 'text-red-600' : 'text-muted-foreground'}>
                {statusContent.label}
              </span>
              {generatedBy && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {generatedBy === 'gemini' ? 'Gemini review' : 'Local fallback'}
                </span>
              )}
            </div>
          </div>
        </div>
        {error && <p className="max-w-xl text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}

function ATSOverview({ review }: { review: ResumeReviewAnalysis }) {
  return (
    <ReviewCard title="ATS Score" icon={Gauge}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center gap-3">
          <ScoreRing score={review.atsScore} label="ATS" />
          <div className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{review.overallRating}</div>
        </div>
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">{review.summary}</p>
          <ScoreBreakdown factors={review.scoreBreakdown} />
        </div>
      </div>
    </ReviewCard>
  )
}

function ScoreBreakdown({ factors }: { factors: ScoreFactor[] }) {
  return (
    <div className="space-y-3">
      {factors.map((factor) => (
        <div key={factor.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{factor.label}</span>
            <span className="text-muted-foreground">{factor.score}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${factor.score}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{factor.rationale}</p>
        </div>
      ))}
    </div>
  )
}

function JobMatchCard({
  jobDescription,
  jobMatch,
  isPending,
  canMatch,
  onChange,
  onAnalyze,
}: {
  jobDescription: string;
  jobMatch: JobMatchAnalysis | null;
  isPending: boolean;
  canMatch: boolean;
  onChange: (value: string) => void;
  onAnalyze: () => void;
}) {
  const isDisabled = !canMatch || isPending || jobDescription.trim().length < 80

  return (
    <ReviewCard title="Job Match" icon={SearchCheck}>
      <div className="space-y-4">
        <textarea
          value={jobDescription}
          onChange={(event) => onChange(event.target.value)}
          rows={7}
          placeholder="Paste a target job description..."
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          disabled={isDisabled}
          onClick={onAnalyze}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Analyze Match
        </button>

        {jobMatch && (
          <div className="space-y-5 border-t pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ScoreRing score={jobMatch.matchScore} label="Match" size="sm" />
              <div>
                <p className="text-lg font-semibold">{jobMatch.rating}</p>
                <p className="text-sm text-muted-foreground">
                  {jobMatch.matchingSkills.length} skills matched, {jobMatch.missingSkills.length} skills missing
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-sm font-medium">Matching Skills</p>
                <BadgeList items={jobMatch.matchingSkills} tone="success" emptyLabel="No direct skill matches" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Missing Skills</p>
                <BadgeList items={jobMatch.missingSkills} tone="warning" emptyLabel="No major skill gaps" />
              </div>
              <ExpandableList title="Resume Suggestions" items={jobMatch.resumeImprovementSuggestions} />
            </div>
          </div>
        )}
      </div>
    </ReviewCard>
  )
}

function InsightPanel({
  title,
  icon,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  icon: typeof CheckCircle2;
  items: string[];
  emptyLabel: string;
  tone: 'success' | 'warning';
}) {
  const Icon = icon

  return (
    <ReviewCard title={title} icon={Icon}>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${tone === 'success' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </ReviewCard>
  )
}

function SkillAnalysisCard({ review }: { review: ResumeReviewAnalysis }) {
  const rows = useMemo(() => {
    const entries = Object.entries(review.skillAnalysis) as [SkillCategoryKey, string[]][]
    const max = Math.max(1, ...entries.map(([, skills]) => skills.length))
    return entries.map(([key, skills]) => ({
      key,
      label: skillCategoryLabels[key],
      skills,
      width: Math.max(8, (skills.length / max) * 100),
    }))
  }, [review.skillAnalysis])

  return (
    <ReviewCard title="Skill Categories" icon={Code2}>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">{row.skills.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${row.width}%` }} />
            </div>
            <BadgeList items={row.skills.slice(0, 10)} emptyLabel="No skills detected" />
          </div>
        ))}
      </div>
    </ReviewCard>
  )
}

function PriorityImprovementsCard({ review }: { review: ResumeReviewAnalysis }) {
  return (
    <ReviewCard title="Priority Improvements" icon={Lightbulb}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Missing Sections</p>
            <BadgeList items={review.missingSections} tone="warning" emptyLabel="No missing core sections" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Missing Keywords</p>
            <BadgeList items={review.missingKeywords} tone="default" emptyLabel="No missing keywords detected" />
          </div>
        </div>
        <div className="divide-y">
          {review.priorityImprovements.map((item) => (
            <details key={item.title} className="group py-4 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityClasses[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{item.recommendation}</p>
                {item.impact && <p>{item.impact}</p>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </ReviewCard>
  )
}

function ProjectAnalysisCard({ projects }: { projects: ProjectAnalysis[] }) {
  return (
    <ReviewCard title="Project Analysis" icon={Sparkles}>
      {projects.length ? (
        <div className="divide-y">
          {projects.map((project) => (
            <details key={project.name} className="group py-5 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{project.qualityRating} - {project.qualityScore}/100</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-3">
                  <BadgeList items={project.technologies} emptyLabel="No technologies detected" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${project.measurableImpact ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span>{project.measurableImpact ? 'Measurable impact present' : 'Impact needs a metric'}</span>
                  </div>
                </div>
                <ProjectDetail project={project} />
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No projects were detected in the resume.</p>
      )}
    </ReviewCard>
  )
}

function ProjectDetail({ project }: { project: ProjectAnalysis }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{project.descriptionQuality}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ExpandableList title="Strengths" items={project.strengths} />
        <ExpandableList title="Weaknesses" items={project.weaknesses} />
      </div>
      <div>
        <p className="mb-1 font-medium">Suggested Description</p>
        <p className="rounded-lg bg-muted p-3 text-muted-foreground">{project.suggestedDescription}</p>
      </div>
    </div>
  )
}

function ExperienceAnalysisCard({ experiences }: { experiences: ExperienceAnalysis[] }) {
  return (
    <ReviewCard title="Experience Analysis" icon={Briefcase}>
      {experiences.length ? (
        <div className="divide-y">
          {experiences.map((experience) => (
            <details key={`${experience.company}-${experience.title}`} className="group py-5 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="font-semibold">{experience.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{experience.company}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ExpandableList title="Weak Bullets" items={experience.weakBullets} />
                <ExpandableList title="Action Rewrites" items={experience.actionRewrites} />
                <ExpandableList title="Quantification Ideas" items={experience.quantificationIdeas} />
                <ExpandableList title="Suggestions" items={experience.suggestions} />
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No experience entries were detected in the resume.</p>
      )}
    </ReviewCard>
  )
}

function ExpandableList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      {items?.length ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="leading-6">- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None detected</p>
      )}
    </div>
  )
}

function LegacyParsedResume({ parsedData }: { parsedData: any }) {
  return (
    <ReviewCard title="Parsed Resume" icon={BarChart3}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Detected Skills</p>
          <BadgeList items={parsedData.skills || []} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Experience</p>
          <div className="space-y-3">
            {(parsedData.experience || []).slice(0, 3).map((entry: any, index: number) => (
              <div key={`${entry.company}-${index}`} className="border-l-2 border-primary/20 pl-4">
                <p className="font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">{entry.company}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReviewCard>
  )
}

function ProcessingState() {
  return (
    <ReviewCard title="Review In Progress" icon={Loader2}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Extracting sections, evaluating ATS signals, and preparing recommendations.
      </div>
    </ReviewCard>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
