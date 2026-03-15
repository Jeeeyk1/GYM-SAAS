'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiService } from '@/lib/api-service'
import { AuthForm } from '@/components/auth-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { Dumbbell } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setToken, setGymSlug, setError, setLoading, error, isLoading } = useAuthStore()

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.loginAsGym(values)
      setToken(response.token)
      setUser(response.user)
      if (response.user.gymId) {
        // Extract slug from gym name or use default
        const slug = response.user.gymName?.toLowerCase().replace(/\s+/g, '-') || 'default'
        setGymSlug(slug)
      }
      router.push('/gym/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GymOS</h1>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-bold mb-2 text-center">Gym Login</h2>
          <p className="text-foreground/60 text-center text-sm mb-6">
            Sign in to manage your gym
          </p>

          <AuthForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
            submitLabel="Sign In"
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-foreground/60">Or</span>
            </div>
          </div>

          {/* Admin Login Link */}
          <p className="text-center text-sm text-foreground/60">
            Are you an admin?{' '}
            <Link
              href="/admin/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Login here
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground/50 mt-6">
          GymOS © 2024. All rights reserved.
        </p>
      </div>
    </main>
  )
}
