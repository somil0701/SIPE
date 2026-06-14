import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, CheckCircle2, Circle, ChevronDown, Filter } from 'lucide-react'
import { questionsApi } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback'

const difficulties = ['all', 'easy', 'medium', 'hard', 'expert']
const types = ['all', 'coding', 'system-design', 'behavioral', 'theoretical']

export function PracticePage() {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)

  const {
    data: queryResult,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['questions', { search, difficulty, type, page }],
    queryFn: () =>
      questionsApi.getAll({
        search: search || undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        type: type !== 'all' ? type : undefined,
        page,
        limit: 20,
      }),
  })

  // questionsApi.getAll uses getWithMeta which returns { data: questions[], meta: { totalPages, ... } }
  const questions = queryResult?.data || []
  const meta = queryResult?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Practice Questions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Solve coding problems, system design challenges, and improve your skills.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-3 rounded-xl border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions by title or keyword..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border/50 bg-background shadow-sm pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Search questions"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-2 sm:pl-0 text-sm text-muted-foreground font-medium shrink-0">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters:</span>
          </div>
          <div className="relative shrink-0">
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value)
                setPage(1)
              }}
              className="appearance-none w-full sm:w-[160px] rounded-lg border border-border/50 bg-background shadow-sm pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-foreground cursor-pointer"
              aria-label="Filter by difficulty"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative shrink-0">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(1)
              }}
              className="appearance-none w-full sm:w-[160px] rounded-lg border border-border/50 bg-background shadow-sm pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-foreground cursor-pointer"
              aria-label="Filter by question type"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Topics' : t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="rounded-xl border bg-card p-12">
          <LoadingState message="Loading questions..." />
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-12">
          <ErrorState
            title="Unable to load questions"
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            }
          />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border bg-card p-12">
          <EmptyState message="No questions found matching your criteria" bordered={false} />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {questions.map((question: any) => (
            <Link
              key={question.id}
              to={`/practice/${question.slug}`}
              className="group flex flex-col gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/40 hover:bg-muted/10 hover:shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                {question.attemptStatus === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                ) : question.attemptStatus ? (
                  <Circle className="h-5 w-5 flex-shrink-0 text-yellow-500 fill-yellow-500/20" />
                ) : (
                  <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground/30" />
                )}
                <div className="min-w-0 flex flex-col gap-1.5">
                  <h3 className="font-semibold text-[15px] group-hover:text-primary transition-colors truncate">
                    {question.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium difficulty-${question.difficulty}`}>
                      {question.difficulty}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {question.type}
                    </span>
                    {question.companyTags?.length > 0 && (
                      <div className="flex items-center gap-1.5 border-l pl-2.5 ml-0.5 border-border/50">
                        {question.companyTags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-6 pl-8 sm:pl-0">
                {/* Acceptance Rate Display */}
                <div className="flex flex-col items-end gap-1.5 w-28 hidden sm:flex">
                  <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground font-medium">
                    <span>Acceptance</span>
                    <span>{question.acceptanceRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/60 overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-primary/60 rounded-full transition-all" 
                      style={{ width: `${question.acceptanceRate}%` }} 
                    />
                  </div>
                </div>

                {/* Mobile Acceptance Rate */}
                <div className="sm:hidden text-xs text-muted-foreground font-medium">
                  {question.acceptanceRate}% acc.
                </div>
                
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex items-center justify-center px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/30 rounded-lg border border-border/50">
            Page {page} of {meta.totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={!meta.hasNext}
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
