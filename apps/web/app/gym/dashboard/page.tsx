'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/sidebar'
import { StatsCard } from '@/components/stats-card'
import {
  BarChart3,
  TrendingUp,
  Users,
  UserCheck,
  Calendar,
} from 'lucide-react'

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  todayCheckIns: number
  weekCheckIns: number
}

export default function GymDashboard() {
  const router = useRouter()
  const { user, token, gymSlug } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    weekCheckIns: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard')
      return
    }

    // Simulate loading data
    setIsLoading(false)
    setStats({
      totalMembers: 342,
      activeMembers: 289,
      todayCheckIns: 47,
      weekCheckIns: 243,
    })
  }, [token, user, router])

  const statCards = [
    {
      icon: Users,
      label: 'Total Members',
      value: stats.totalMembers.toString(),
      change: '+12 this month',
      isPositive: true,
    },
    {
      icon: UserCheck,
      label: 'Check-ins Today',
      value: stats.todayCheckIns.toString(),
      change: '+5% vs yesterday',
      isPositive: true,
    },
    {
      icon: Calendar,
      label: 'Week Check-ins',
      value: stats.weekCheckIns.toString(),
      change: '+8% from last week',
      isPositive: true,
    },
    {
      icon: TrendingUp,
      label: 'Monthly Revenue',
      value: '₱125K',
      change: '+23% growth',
      isPositive: true,
    },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar gymName={user?.gymName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground/60 mt-1">Welcome back, {user?.name}!</p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-foreground/70">{stat.label}</p>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground mb-2">{stat.value}</p>
                      <p className={`text-sm ${stat.isPositive ? 'text-chart-2' : 'text-destructive'}`}>
                        {stat.change}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                  <h2 className="font-semibold mb-4 text-foreground">Check-in Trend</h2>
                  <div className="h-64 flex items-center justify-center text-foreground/30 rounded-lg bg-secondary">
                    <BarChart3 className="w-16 h-16" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                  <h2 className="font-semibold mb-4 text-foreground">Membership Distribution</h2>
                  <div className="h-64 flex items-center justify-center text-foreground/30 rounded-lg bg-secondary">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full border-4 border-primary/20 mx-auto"></div>
                      <p className="mt-4 text-sm text-foreground/70">Premium: 120</p>
                      <p className="text-sm text-foreground/70">Standard: 180</p>
                      <p className="text-sm text-foreground/70">Trial: 42</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
