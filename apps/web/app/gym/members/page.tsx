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
  Calendar,
} from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  phone: string
  membershipType: 'standard' | 'premium' | 'trial'
  joinDate: string
  lastCheckIn?: string
  status: 'active' | 'inactive'
}

export default function MembersPage() {
  const router = useRouter()
  const { user, token, gymSlug } = useAuthStore()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    // Simulate loading members
    setIsLoading(false)
    setMembers([
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        membershipType: 'premium',
        joinDate: '2024-01-15',
        lastCheckIn: '2024-03-02',
        status: 'active',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '(555) 234-5678',
        membershipType: 'standard',
        joinDate: '2024-02-10',
        lastCheckIn: '2024-03-02',
        status: 'active',
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '(555) 345-6789',
        membershipType: 'trial',
        joinDate: '2024-03-01',
        lastCheckIn: '2024-03-02',
        status: 'active',
      },
      {
        id: '4',
        name: 'Sarah Williams',
        email: 'sarah@example.com',
        phone: '(555) 456-7890',
        membershipType: 'premium',
        joinDate: '2023-12-20',
        lastCheckIn: '2024-02-28',
        status: 'inactive',
      },
    ])
  }, [token, router])

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMembershipColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-primary/15 text-primary font-medium'
      case 'standard':
        return 'bg-blue-100 text-blue-700 font-medium'
      case 'trial':
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
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-foreground/60 mt-1">
            {members.length} total members • {members.filter(m => m.status === 'active').length} active
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="bg-card border border-border rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">All Members</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-foreground/40" />
                  <Input
                    placeholder="Search members..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-8 text-center text-foreground/60">Loading...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                <p className="text-foreground/60">No members found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Last Check-in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
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
                          className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getMembershipColor(member.membershipType)}`}
                        >
                          {member.membershipType}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-foreground/60">
                        {member.lastCheckIn ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(member.lastCheckIn).toLocaleDateString()}
                          </div>
                        ) : (
                          '-'
                        )}
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
