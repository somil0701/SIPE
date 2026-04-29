import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { FileText, Download, ExternalLink } from 'lucide-react';

export function AdminResumesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-resumes', page, statusFilter],
    queryFn: () => adminApi.getResumes({
      page,
      limit: 10,
      status: statusFilter || undefined,
    }),
  });

  const resumes = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Resumes Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Review uploaded resumes and ATS parsed scores.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <select
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PARSED">Parsed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">ATS Score</th>
                <th className="px-6 py-4 font-medium">Upload Date</th>
                <th className="px-6 py-4 font-medium text-right">Resume</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading resumes...
                  </td>
                </tr>
              ) : resumes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No resumes found matching your filters.
                  </td>
                </tr>
              ) : (
                resumes.map((resume: any) => (
                  <tr key={resume.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{resume.user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{resume.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${resume.status === 'PARSED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}
                        ${resume.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' : ''}
                        ${resume.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : ''}
                      `}>
                        {resume.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {resume.overallScore !== null ? (
                        <span className={resume.overallScore >= 70 ? 'text-green-600' : resume.overallScore >= 40 ? 'text-amber-600' : 'text-red-600'}>
                          {resume.overallScore}/100
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(resume.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {resume.fileUrl ? (
                        <a 
                          href={resume.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">No File</span>
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
              Showing {((page - 1) * meta.limit) + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} resumes
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
    </div>
  );
}
