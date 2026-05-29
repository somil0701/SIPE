import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import { ApiResponse } from '../types'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api/v1'

/** Decode JWT exp claim without a library (payload is base64url encoded) */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ?? null
  } catch {
    return null
  }
}

/** Returns true if the JWT is expired (with a 30-second buffer) */
function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token)
  if (!exp) return false
  return Date.now() / 1000 > exp - 30
}

class ApiService {
  private client: AxiosInstance
  private refreshPromise: Promise<void> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor — attach Bearer token; proactively refresh if expired
    this.client.interceptors.request.use(async (config) => {
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }

      let tokens = useAuthStore.getState().tokens

      // Fallback from localStorage if store hasn't hydrated yet
      if (!tokens) {
        try {
          const stored = localStorage.getItem('auth-storage')
          if (stored) {
            const parsed = JSON.parse(stored)
            tokens = parsed?.state?.tokens
          }
        } catch {
          // ignore parse errors
        }
      }

      // Proactively refresh if access token is expired but we have a refresh token
      if (tokens?.accessToken && isTokenExpired(tokens.accessToken) && tokens.refreshToken) {
        // Deduplicate concurrent refresh calls
        if (!this.refreshPromise) {
          this.refreshPromise = axios
            .post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken: tokens.refreshToken }
            )
            .then((res) => {
              if (res.data.success && res.data.data) {
                const { accessToken, refreshToken, expiresIn } = res.data.data
                useAuthStore.setState(() => ({ tokens: { accessToken, refreshToken, expiresIn } }))
              }
            })
            .catch(() => {
              useAuthStore.getState().logout()
              window.location.href = '/login'
            })
            .finally(() => {
              this.refreshPromise = null
            })
        }
        await this.refreshPromise
        // Re-read tokens after refresh
        tokens = useAuthStore.getState().tokens
      }

      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`
      }

      return config
    })

    // Response interceptor — handle 401 / token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        // Guard: error.config can be undefined in Axios v1
        if (!error.config) return Promise.reject(error)

        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Handle token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          const tokens = useAuthStore.getState().tokens

          if (tokens?.refreshToken) {
            try {
              const response = await axios.post<ApiResponse<{
                accessToken: string
                refreshToken: string
                expiresIn: number
              }>>(`${API_BASE_URL}/auth/refresh`, {
                refreshToken: tokens.refreshToken,
              })

              if (response.data.success && response.data.data) {
                const { accessToken, refreshToken, expiresIn } = response.data.data
                useAuthStore.setState(() => ({
                  tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn,
                  },
                }))

                originalRequest.headers = originalRequest.headers || {}
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return this.client(originalRequest)
              }
            } catch (refreshError) {
              // Refresh failed — log out and redirect
              useAuthStore.getState().logout()
              window.location.href = '/login'
              return Promise.reject(refreshError)
            }
          } else {
            // No refresh token available — log out
            useAuthStore.getState().logout()
            window.location.href = '/login'
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * All methods below return `T` directly — the inner `data` field from the API envelope.
   * The backend responds as: { success: true, data: T, meta?: ... }
   * We unwrap that here so callers get T directly without an extra `.data` access.
   */

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return response.data.data as T
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return response.data.data as T
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return response.data.data as T
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return response.data.data as T
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return response.data.data as T
  }

  /**
   * Like get<T> but also returns meta (pagination info, counts, etc.)
   * Use this for paginated list endpoints.
   */
  async getWithMeta<T>(url: string, config?: AxiosRequestConfig): Promise<{ data: T; meta?: any }> {
    const response = await this.client.get<ApiResponse<T>>(url, config)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed')
    }
    return {
      data: response.data.data as T,
      meta: (response.data as any).meta,
    }
  }

  // Expose the raw axios client for multipart or custom usage
  get rawClient() {
    return this.client
  }
}

export const api = new ApiService()

// ============================================================
// Auth API
// Backend response shape: { success: true, data: { user, tokens } }
// api.post unwraps to { user, tokens } directly
// ============================================================
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; tokens: any }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post<{ user: any; tokens: any }>('/auth/register', data),
  logout: () => api.post<void>('/auth/logout'),
  getMe: () => api.get<{ user: any }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/auth/change-password', { currentPassword, newPassword }),
}

// ============================================================
// Questions API
// Backend: { success, data: questions[], meta } or { success, data: question }
// api.get<T> unwraps to T directly
// ============================================================
export const questionsApi = {
  // Returns { data: any[], meta: { total, totalPages, hasNext, hasPrev, ... } }
  getAll: (params?: Record<string, string | number | undefined>) =>
    api.getWithMeta<any[]>('/questions', { params }),
  getBySlug: (slug: string) => api.get<any>(`/questions/slug/${slug}`),
  getById: (id: string) => api.get<any>(`/questions/${id}`),
  search: (q: string, page = 1, limit = 20) =>
    api.getWithMeta<any[]>('/questions/search', { params: { q, page, limit } }),
  getRecommended: (limit = 5) =>
    api.get<any[]>('/questions/recommended', { params: { limit } }),
  getDueReviews: (limit = 10) =>
    api.get<any[]>('/questions/due-reviews', { params: { limit } }),
  getCompanyQuestions: (company: string, page = 1, limit = 20) =>
    api.getWithMeta<any[]>(`/questions/company/${company}`, { params: { page, limit } }),
}

// ============================================================
// Attempts API
// ============================================================
export const attemptsApi = {
  submit: (data: { questionId: string; code: string; language: string; timeSpent: number }) =>
    api.post<any>('/attempts', data),
  run: (data: { questionId: string; code: string; language: string; input: string }) =>
    api.post<any>('/attempts/run', data),
  getAll: (params?: Record<string, string | number>) =>
    api.get<any>('/attempts', { params }),
  getById: (id: string) => api.get<any>(`/attempts/${id}`),
  getFeedback: (id: string) => api.get<any>(`/attempts/${id}/feedback`),
}

// ============================================================
// Interviews API
// ============================================================
export const interviewsApi = {
  create: (data: any) => api.post<any>('/interviews', data),
  getAll: (params?: Record<string, string | number>) =>
    api.get<any[]>('/interviews', { params }),
  getById: (id: string) => api.get<any>(`/interviews/${id}`),
  start: (id: string) => api.post<any>(`/interviews/${id}/start`),
  getCurrentQuestion: (id: string) => api.get<any>(`/interviews/${id}/current-question`),
  submitAnswer: (id: string, answer: string) =>
    api.post<any>(`/interviews/${id}/answer`, { answer }),
  skipQuestion: (id: string) => api.post<any>(`/interviews/${id}/skip`),
  complete: (id: string) => api.post<any>(`/interviews/${id}/complete`),
  cancel: (id: string) => api.post<void>(`/interviews/${id}/cancel`),
  delete: (id: string) => api.delete<void>(`/interviews/${id}`),
}

// ============================================================
// Analytics API
// ============================================================
export const analyticsApi = {
  getUserAnalytics: () => api.get<any>('/analytics'),
  getDaily: (days = 30) => api.get<any[]>('/analytics/daily', { params: { days } }),
  getWeakTopics: (limit = 5) => api.get<any[]>('/analytics/weak-topics', { params: { limit } }),
  getStrongTopics: (limit = 5) => api.get<any[]>('/analytics/strong-topics', { params: { limit } }),
  getLeaderboard: (type: 'global' | 'weekly' = 'global', limit = 10) =>
    api.get<any[]>('/analytics/leaderboard', { params: { type, limit } }),
}

// ============================================================
// Resume API
// ============================================================
export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('resume', file)
    return api.post<any>('/resumes/upload', formData)
  },
  getAll: () => api.get<any[]>('/resumes'),
  getCurrent: () => api.get<any>('/resumes/current'),
  getSkillsGap: () => api.get<any>('/resumes/skills-gap/analysis'),
  getPersonalizedQuestions: (limit = 5) =>
    api.get<any[]>('/resumes/personalized-questions/list', { params: { limit } }),
  delete: (id: string) => api.delete<void>(`/resumes/${id}`),
}

// ============================================================
// User API
// ============================================================
export const userApi = {
  getProfile: () => api.get<any>('/users/profile'),
  updateProfile: (data: any) => api.patch<any>('/users/profile', data),
  getSkills: () => api.get<any[]>('/users/skills'),
  updateSkills: (skills: any[]) => api.put<void>('/users/skills', { skills }),
  getStats: () => api.get<any>('/users/stats'),
  deleteAccount: () => api.delete<void>('/users/account'),
}

// ============================================================
// Learning Path API
// ============================================================
export const learningPathApi = {
  getAll: () => api.get<any[]>('/learning-paths'),
  create: (data: any) => api.post<any>('/learning-paths', data),
  getById: (id: string) => api.get<any>(`/learning-paths/${id}`),
  updateItem: (pathId: string, itemId: string, status: string) =>
    api.patch<any>(`/learning-paths/${pathId}/items/${itemId}`, { status }),
  pause: (id: string) => api.post<void>(`/learning-paths/${id}/pause`),
  resume: (id: string) => api.post<void>(`/learning-paths/${id}/resume`),
  delete: (id: string) => api.delete<void>(`/learning-paths/${id}`),
}

// ============================================================
// Spaced Repetition API
// ============================================================
export const spacedRepetitionApi = {
  getAll: () => api.get<any[]>('/spaced-repetition'),
  getDue: (limit = 10) => api.get<any>('/spaced-repetition/due', { params: { limit } }),
  getStats: () => api.get<any>('/spaced-repetition/stats'),
  getById: (id: string) => api.get<any>(`/spaced-repetition/${id}`),
  review: (id: string, qualityRating: number) =>
    api.post<any>(`/spaced-repetition/${id}/review`, { qualityRating }),
  addQuestion: (questionId: string) =>
    api.post<any>(`/spaced-repetition/questions/${questionId}/add`),
  delete: (id: string) => api.delete<void>(`/spaced-repetition/${id}`),
  reset: (id: string) => api.post<any>(`/spaced-repetition/${id}/reset`),
}
