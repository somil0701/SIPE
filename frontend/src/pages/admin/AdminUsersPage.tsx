import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import {
  Search,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  Crown,
  User,
  Mic,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [premiumFilter, setPremiumFilter] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, premiumFilter],
    queryFn: () => adminApi.getUsers({
      page,
      limit: 10,
      search: search || undefined,
      role: roleFilter || undefined,
      isPremium: premiumFilter ? premiumFilter === 'true' : undefined,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setActionMenuOpenId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    }
  });

  const handleUpdate = (id: string, data: any) => {
    updateMutation.mutate({ id, data });
  };

  const users = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Users Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts, roles, and subscriptions.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="premium">Premium</option>
          <option value="admin">Admin</option>
          <option value="interviewer">Interviewer</option>
        </select>
        <select
          className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={premiumFilter}
          onChange={(e) => {
            setPremiumFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Any Plan</option>
          <option value="true">Premium</option>
          <option value="false">Free</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.fullName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {user.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        {user.role === 'interviewer' && <Mic className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isPremium ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                          <Crown className="w-3 h-3" />
                          Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.deletedAt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                          <Ban className="w-3 h-3" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuOpenId(actionMenuOpenId === user.id ? null : user.id)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {actionMenuOpenId === user.id && (
                        <div className="absolute right-6 top-10 w-48 bg-card border rounded-lg shadow-lg z-10 py-1 text-left overflow-hidden">
                          {user.deletedAt ? (
                            <button
                              onClick={() => handleUpdate(user.id, { isBanned: false })}
                              className="w-full px-4 py-2 text-sm text-green-600 hover:bg-muted flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Unban User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdate(user.id, { isBanned: true })}
                              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-muted flex items-center gap-2"
                            >
                              <Ban className="w-4 h-4" /> Ban User
                            </button>
                          )}
                          <div className="border-t my-1"></div>
                          {user.role !== 'admin' ? (
                            <button
                              onClick={() => handleUpdate(user.id, { role: 'admin' })}
                              className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <ShieldAlert className="w-4 h-4 text-primary" /> Make Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdate(user.id, { role: 'user' })}
                              className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <User className="w-4 h-4 text-primary" /> Remove Admin
                            </button>
                          )}
                          {!user.isPremium ? (
                            <button
                              onClick={() => handleUpdate(user.id, { isPremium: true })}
                              className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <Crown className="w-4 h-4 text-amber-500" /> Grant Premium
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdate(user.id, { isPremium: false })}
                              className="w-full px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <Ban className="w-4 h-4 text-muted-foreground" /> Revoke Premium
                            </button>
                          )}
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
              Showing {((page - 1) * meta.limit) + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} users
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
    </div>
  );
}
