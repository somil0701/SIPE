import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import {
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  EyeOff,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminQuestionForm } from './AdminQuestionForm';

export function AdminQuestionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-questions', page, search, difficultyFilter],
    queryFn: () => adminApi.getQuestions({
      page,
      limit: 10,
      search: search || undefined,
      difficulty: difficultyFilter || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteQuestion(id),
    onSuccess: () => {
      toast.success('Question deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setActionMenuOpenId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete question');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.updateQuestion(id, { isActive }),
    onSuccess: () => {
      toast.success('Question visibility updated');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setActionMenuOpenId(null);
    },
  });

  const handleEdit = (question: any) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
    setActionMenuOpenId(null);
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };

  const questions = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Practice Questions</h1>
          <p className="text-muted-foreground mt-1">
            Manage the coding question bank and content.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or slug..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={difficultyFilter}
          onChange={(e) => {
            setDifficultyFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Question</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Difficulty</th>
                <th className="px-6 py-4 font-medium">Acceptance</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No questions found matching your filters.
                  </td>
                </tr>
              ) : (
                questions.map((question: any) => (
                  <tr key={question.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{question.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{question.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md capitalize">
                        {question.type.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full difficulty-${question.difficulty} capitalize`}>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {question.acceptanceRate}%
                    </td>
                    <td className="px-6 py-4">
                      {question.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-medium">
                          <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuOpenId(actionMenuOpenId === question.id ? null : question.id)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {actionMenuOpenId === question.id && (
                        <div className="absolute right-6 top-10 w-48 bg-card border rounded-lg shadow-lg z-10 py-1 text-left overflow-hidden">
                          <button
                            onClick={() => handleEdit(question)}
                            className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4 text-primary" /> Edit
                          </button>
                          
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: question.id, isActive: !question.isActive })}
                            className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                          >
                            {question.isActive ? (
                              <><EyeOff className="w-4 h-4 text-muted-foreground" /> Hide Question</>
                            ) : (
                              <><Eye className="w-4 h-4 text-green-600" /> Show Question</>
                            )}
                          </button>

                          <div className="border-t my-1"></div>
                          
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${question.title}"?`)) {
                                deleteMutation.mutate(question.id);
                              }
                            }}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-muted flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * meta.limit) + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} questions
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border bg-background disabled:opacity-50 hover:bg-muted transition-colors text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1 rounded border bg-background disabled:opacity-50 hover:bg-muted transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global click handler to close dropdowns */}
      {actionMenuOpenId && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActionMenuOpenId(null)} 
        />
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <AdminQuestionForm 
          question={editingQuestion}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
