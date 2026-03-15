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
  Plus,
  Search,
  MoreHorizontal,
  AlertCircle,
  Badge,
} from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: 'manager' | 'trainer' | 'staff'
  joinDate: string
  status: 'active' | 'inactive'
}

export default function StaffPage() {
  const router = useRouter()
  const { user, token, gymSlug } = useAuthStore()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    // Simulate loading staff
    setIsLoading(false)
    setStaff([
      {
        id: '1',
        name: 'Alex Rodriguez',
        email: 'alex@gym.com',
        phone: '(555) 111-2222',
        role: 'manager',
        joinDate: '2023-06-15',
        status: 'active',
      },
      {
        id: '2',
        name: 'Emma Thompson',
        email: 'emma@gym.com',
        phone: '(555) 222-3333',
        role: 'trainer',
        joinDate: '2023-09-20',
        status: 'active',
      },
      {
        id: '3',
        name: 'David Chen',
        email: 'david@gym.com',
        phone: '(555) 333-4444',
        role: 'trainer',
        joinDate: '2024-01-10',
        status: 'active',
      },
      {
        id: '4',
        name: 'Lisa Martinez',
        email: 'lisa@gym.com',
        phone: '(555) 444-5555',
        role: 'staff',
        joinDate: '2024-02-01',
        status: 'active',
      },
    ])
  }, [token, router])

  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-primary/15 text-primary font-medium'
      case 'trainer':
        return 'bg-blue-100 text-blue-700 font-medium'
      case 'staff':
        return 'bg-amber-100 text-amber-700 font-medium'
      default:
        return 'bg-muted text-foreground/60'
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar gymName={user?.gymName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-foreground/60 mt-1">
            {staff.length} total staff • {staff.filter(s => s.status === 'active').length} active
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="bg-card border border-border rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">All Staff</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-foreground/40" />
                  <Input
                    placeholder="Search staff..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-8 text-center text-foreground/60">Loading...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                <p className="text-foreground/60">No staff found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow
                      key={member.id}
                      className="border-b border-border last:border-0 hover:bg-secondary transition-colors"
                    >
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-foreground/60">
                        {member.email}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {member.phone}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getRoleColor(member.role)}`}
                        >
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            member.status === 'active'
                              ? 'bg-chart-2/15 text-chart-2'
                              : 'bg-muted text-foreground/60'
                          }`}
                        >
                          {member.status}
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
