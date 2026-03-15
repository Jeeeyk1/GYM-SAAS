import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'gym_owner' | 'staff'
  gymId?: string
  gymName?: string
}

interface AuthState {
  user: User | null
  token: string | null
  gymSlug: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setGymSlug: (slug: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      gymSlug: null,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setGymSlug: (slug) => set({ gymSlug: slug }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      logout: () => set({ 
        user: null, 
        token: null, 
        gymSlug: null,
        error: null 
      }),
    }),
    {
      name: 'auth-store',
    }
  )
)
