'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/sidebar'
import { StatsCard } from '@/components/stats-card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  MoreHorizontal,
  AlertCircle,
  Dumbbell,
  Users,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Gym {
  id: string
  name: string
  slug: string
  email: string
  city: string
  state: string
  memberCount: number
  staffCount: number
  status: 'active' | 'inactive'
  createdAt: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [gyms, setGyms] = useState<Gym[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // if (!token) {
    //   router.push('/admin/login')
    //   return
    // }

    // if (user?.role !== 'admin') {
    //   router.push('/gym/dashboard')
    //   return
    // }

    // Simulate loading gyms
    setIsLoading(false)
    setGyms([
      {
        id: '1',
        name: 'CrossFit Elite',
        slug: 'crossfit-elite',
        email: 'admin@crossfitelite.com',
        city: 'New York',
        state: 'NY',
        memberCount: 245,
        staffCount: 12,
        status: 'active',
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        name: 'Strength Training Hub',
        slug: 'strength-hub',
        email: 'admin@strengthhub.com',
        city: 'Los Angeles',
        state: 'CA',
        memberCount: 189,
        staffCount: 8,
        status: 'active',
        createdAt: '2024-02-20',
      },
      {
        id: '3',
        name: 'Yoga & Wellness',
        slug: 'yoga-wellness',
        email: 'admin@yogawellness.com',
        city: 'San Francisco',
        state: 'CA',
        memberCount: 156,
        staffCount: 6,
        status: 'active',
        createdAt: '2024-03-10',
      },
    ])
  }, [token, user, router])

  const filteredGyms = gyms.filter(
    (gym) =>
      gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Gyms Management</h1>
          <p className="text-foreground/60 mt-1">Manage all your gyms in one place</p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/70 text-sm font-medium">Total Gyms</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">{gyms.length}</p>
                  <p className="text-xs text-primary mt-2">+12% this month</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/70 text-sm font-medium">Total Members</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">{gyms.reduce((sum, g) => sum + g.memberCount, 0)}</p>
                  <p className="text-xs text-chart-2 mt-2">+8% growth</p>
                </div>
                <div className="p-3 rounded-lg bg-chart-2/10">
                  <Users className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/70 text-sm font-medium">Total Staff</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">{gyms.reduce((sum, g) => sum + g.staffCount, 0)}</p>
                  <p className="text-xs text-foreground/60 mt-2">Across all gyms</p>
                </div>
                <div className="p-3 rounded-lg bg-foreground/5">
                  <Users className="w-6 h-6 text-foreground/60" />
                </div>
              </div>
            </div>
          </div>

          {/* Gyms Table */}
          <div className="bg-card border border-border rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">All Gyms</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-foreground/40" />
                  <Input
                    placeholder="Search gyms..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Gym
                </Button>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-8 text-center text-foreground/60">Loading...</div>
            ) : filteredGyms.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                <p className="text-foreground/60">No gyms found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGyms.map((gym) => (
                    <TableRow
                      key={gym.id}
                      className="border-b border-border last:border-0 hover:bg-secondary transition-colors"
                    >
                      <TableCell className="font-medium">{gym.name}</TableCell>
                      <TableCell className="text-foreground/60">
                        {gym.email}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {gym.city}, {gym.state}
                      </TableCell>
                      <TableCell>{gym.memberCount}</TableCell>
                      <TableCell>{gym.staffCount}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            gym.status === 'active'
                              ? 'bg-chart-2/15 text-chart-2'
                              : 'bg-muted text-foreground/60'
                          }`}
                        >
                          {gym.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
