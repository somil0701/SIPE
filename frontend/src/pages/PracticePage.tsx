import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { questionsApi } from '../services/api'

const difficulties = ['all', 'easy', 'medium', 'hard', 'expert']
const types = ['all', 'coding', 'system-design', 'behavioral', 'theoretical']

export function PracticePage() {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)

  const { data: queryResult, isLoading } = useQuery({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practice Questions</h1>
        <p className="text-muted-foreground mt-1">
          Solve coding problems and improve your skills
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No questions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question: any) => (
            <Link
              key={question.id}
              to={`/practice/${question.slug}`}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {question.attemptStatus === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : question.attemptStatus ? (
                  <Circle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h3 className="font-medium">{question.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full difficulty-${question.difficulty}`}>
                      {question.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {question.type}
                    </span>
                    {question.companyTags?.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {question.companyTags.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {question.acceptanceRate}% acceptance
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={!meta.hasNext}
            className="px-4 py-2 rounded-lg border hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
