import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'PARSED', label: 'Parsed' },
  { value: 'FAILED', label: 'Failed (legacy)' },
];

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const getStatusClass = (status?: string) => {
  const normalized = status?.toLowerCase();

  if (normalized === 'completed' || normalized === 'parsed') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  }

  if (normalized === 'pending' || normalized === 'processing') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
  }

  if (normalized === 'failed') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  }

  return 'bg-muted text-muted-foreground';
};

const getDownloadFileName = (resume: any) =>
  resume.originalName || resume.fileName || `resume-${resume.id}`;

const getDownloadErrorMessage = async (error: any) => {
  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      return parsed.error?.message || parsed.message || 'Failed to download resume';
    } catch {
      return 'Failed to download resume';
    }
  }

  return responseData?.error?.message || error.message || 'Failed to download resume';
};

export function AdminResumesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownload = async (resume: any) => {
    setDownloadingId(resume.id);

    try {
      const response = await adminApi.downloadResume(resume.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFileName(resume);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(await getDownloadErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Resume Management</h1>
        <p className="text-muted-foreground mt-1">
          Review uploaded resume files and download them securely.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <select
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Original Name</th>
                <th className="px-6 py-4 font-medium">Stored Filename</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Uploaded</th>
                <th className="px-6 py-4 font-medium text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Loading resumes...
                  </td>
                </tr>
              ) : resumes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No resumes found matching your filters.
                  </td>
                </tr>
              ) : (
                resumes.map((resume: any) => (
                  <tr key={resume.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{resume.user?.fullName || 'Unknown user'}</div>
                      <div className="text-xs text-muted-foreground">{resume.user?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{resume.originalName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-muted-foreground break-all">
                        {resume.fileName || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatBytes(resume.fileSize)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusClass(resume.parsingStatus)}`}>
                        {resume.parsingStatus || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(resume)}
                        disabled={downloadingId === resume.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-60"
                      >
                        <Download className="w-4 h-4" />
                        {downloadingId === resume.id ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * meta.limit) + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} resumes
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border bg-background disabled:opacity-50 hover:bg-muted transition-colors text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((currentPage) => Math.min(meta.totalPages, currentPage + 1))}
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
