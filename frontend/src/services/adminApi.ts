import { api } from './api';

export const adminApi = {
  getStats: () => api.get<any>('/admin/stats'),
  getGrowthChart: () => api.get<any[]>('/admin/growth-chart'),
  getJudgeReliability: (days = 7) => api.get<any>('/admin/judge-reliability', { params: { days } }),
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; isPremium?: boolean }) => 
    api.getWithMeta<any[]>('/admin/users', { params }),
  updateUser: (id: string, data: { role?: string; isPremium?: boolean; isBanned?: boolean }) =>
    api.patch<any>(`/admin/users/${id}`, data),
    
  getQuestions: (params?: { page?: number; limit?: number; search?: string; difficulty?: string }) => 
    api.getWithMeta<any[]>('/admin/questions', { params }),
  createQuestion: (data: any) => api.post<any>('/admin/questions', data),
  updateQuestion: (id: string, data: any) => api.patch<any>(`/admin/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete<any>(`/admin/questions/${id}`),
  
  getSkills: () => api.get<any[]>('/admin/skills'),

  getMockInterviews: (params?: { page?: number; limit?: number; status?: string }) => 
    api.getWithMeta<any[]>('/admin/interviews', { params }),

  getResumes: (params?: { page?: number; limit?: number; status?: string }) => 
    api.getWithMeta<any[]>('/admin/resumes', { params }),
  downloadResume: (id: string) =>
    api.rawClient.get(`/admin/resumes/${id}/download`, { responseType: 'blob' }),
};
