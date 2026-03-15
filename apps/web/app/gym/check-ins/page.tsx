'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/sidebar'
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
  Search,
  AlertCircle,
  Clock,
  User,
  Calendar,
} from 'lucide-react'

interface CheckIn {
  id: string
  memberName: string
  membershipType: string
  checkInTime: string
  checkOutTime?: string
  duration?: string
}

export default function CheckInsPage() {
  const router = useRouter()
  const { user, token, gymSlug } = useAuthStore()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    // Simulate loading check-ins
    setIsLoading(false)
    const today = new Date().toISOString().split('T')[0]
    setFilterDate(today)
    
    setCheckIns([
      {
        id: '1',
        memberName: 'John Doe',
        membershipType: 'premium',
        checkInTime: `${today}T06:30:00`,
        checkOutTime: `${today}T07:45:00`,
        duration: '1h 15m',
      },
      {
        id: '2',
        memberName: 'Jane Smith',
        membershipType: 'standard',
        checkInTime: `${today}T07:00:00`,
        checkOutTime: `${today}T08:30:00`,
        duration: '1h 30m',
      },
      {
        id: '3',
        memberName: 'Mike Johnson',
        membershipType: 'trial',
        checkInTime: `${today}T08:15:00`,
        checkOutTime: undefined,
      },
      {
        id: '4',
        memberName: 'Sarah Williams',
        membershipType: 'premium',
        checkInTime: `${today}T17:00:00`,
        checkOutTime: `${today}T18:20:00`,
        duration: '1h 20m',
      },
      {
        id: '5',
        memberName: 'Robert Brown',
        membershipType: 'standard',
        checkInTime: `${today}T18:30:00`,
        checkOutTime: undefined,
      },
    ])
  }, [token, router])

  const filteredCheckIns = checkIns.filter(
    (checkIn) =>
      checkIn.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTimeString = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const activeCheckIns = checkIns.filter((c) => !c.checkOutTime).length
  const totalCheckIns = checkIns.length

  return (
    <div className="flex h-screen bg-background">
      <Sidebar gymName={user?.gymName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Check-ins</h1>
          <p className="text-foreground/60 mt-1">
            {activeCheckIns} members currently in gym • {totalCheckIns} total today
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm font-medium">Currently Active</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">{activeCheckIns}</p>
                  <p className="text-xs text-chart-2 mt-2">Members in gym</p>
                </div>
                <div className="p-3 rounded-lg bg-chart-2/10">
                  <User className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm font-medium">Today's Total</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">{totalCheckIns}</p>
                  <p className="text-xs text-primary mt-2">Total check-ins</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground/60 text-sm font-medium">Avg Session</p>
                  <p className="text-3xl font-bold mt-3 text-foreground">1h 24m</p>
                  <p className="text-xs text-foreground/60 mt-2">Average duration</p>
                </div>
                <div className="p-3 rounded-lg bg-foreground/5">
                  <Calendar className="w-6 h-6 text-foreground/60" />
                </div>
              </div>
            </div>
          </div>

          {/* Check-ins Table */}
          <div className="bg-card border border-border rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Today's Check-ins</h2>
              <div className="flex items-center gap-4">
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-40"
                />
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-foreground/40" />
                  <Input
                    placeholder="Search members..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-8 text-center text-foreground/60">Loading...</div>
            ) : filteredCheckIns.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                <p className="text-foreground/60">No check-ins found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckIns.map((checkIn) => (
                    <TableRow
                      key={checkIn.id}
                      className="border-b border-border last:border-0 hover:bg-secondary transition-colors"
                    >
                      <TableCell className="font-medium">
                        {checkIn.memberName}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium capitalize ${
                          checkIn.membershipType === 'premium'
                            ? 'bg-primary/15 text-primary'
                            : checkIn.membershipType === 'standard'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {checkIn.membershipType}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {getTimeString(checkIn.checkInTime)}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {checkIn.checkOutTime ? getTimeString(checkIn.checkOutTime) : '-'}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {checkIn.duration || '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            checkIn.checkOutTime
                              ? 'bg-muted text-foreground/60'
                              : 'bg-chart-2/15 text-chart-2'
                          }`}
                        >
                          {checkIn.checkOutTime ? 'Checked Out' : 'In Gym'}
                        </span>
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
