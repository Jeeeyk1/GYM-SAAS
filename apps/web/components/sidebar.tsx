'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  BarChart3,
  Users,
  UserCheck,
  LogOut,
  Settings,
  Dumbbell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  gymName?: string
}

export function Sidebar({ gymName }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    {
      href: '/admin/dashboard',
      label: 'Gyms',
      icon: Dumbbell,
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const staffLinks = [
    {
      href: '/gym/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/gym/members',
      label: 'Members',
      icon: Users,
    },
    {
      href: '/gym/staff',
      label: 'Staff',
      icon: Users,
    },
    {
      href: '/gym/check-ins',
      label: 'Check-ins',
      icon: UserCheck,
    },
    {
      href: '/gym/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const links = isAdmin ? adminLinks : staffLinks

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      {/* Logo/Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-2">
          <Dumbbell className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-sidebar-foreground">Gym</span><span className="text-primary">OS</span>
          </h1>
        </div>
        {gymName && (
          <p className="text-xs text-sidebar-foreground/50 truncate">{gymName}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between gap-2 px-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user?.email}
            </p>
          </div>
          <ThemeToggle compact />
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start text-xs"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
