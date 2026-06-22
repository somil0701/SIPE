import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthTokens } from '../types'
import { queryClient } from '../lib/queryClient'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isHydrated: boolean
  setAuth: (user: User, tokens: AuthTokens) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user, tokens) => {
        const previousUserId = useAuthStore.getState().user?.id
        if (previousUserId !== user.id) {
          queryClient.removeQueries()
        }
        set({
          user,
          tokens,
          isAuthenticated: true,
        })
      },

      logout: () => {
        queryClient.removeQueries()
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        })
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
