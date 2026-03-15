'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { apiService } from '@/lib/api-service'
import { AuthForm } from '@/components/auth-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { Dumbbell, ShieldAlert } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const { setUser, setToken, setError, setLoading, error, isLoading } = useAuthStore()

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.loginAsAdmin(values)
      setToken(response.token)
      setUser(response.user)
      router.push('/admin/dashboard')
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-center">Admin Login</h2>
          </div>
          <p className="text-foreground/60 text-center text-sm mb-6">
            Administrator access only
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

          {/* Gym Login Link */}
          <p className="text-center text-sm text-foreground/60">
            Are you a gym owner?{' '}
            <Link
              href="/login"
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
