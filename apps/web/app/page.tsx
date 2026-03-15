'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  BarChart3,
  Users,
  UserCheck,
  Lock,
  Zap,
  TrendingUp,
  Dumbbell,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Member Management',
    description: 'Track all your gym members with detailed profiles and membership types',
  },
  {
    icon: UserCheck,
    title: 'Smart Check-ins',
    description: 'Quick and easy member check-in system to monitor gym usage',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Real-time insights into member attendance and gym performance',
  },
  {
    icon: Users,
    title: 'Staff Management',
    description: 'Manage trainers and staff members with role-based access',
  },
  {
    icon: Lock,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security to protect your gym data',
  },
  {
    icon: Zap,
    title: 'Fast & Responsive',
    description: 'Lightning-fast performance for the best user experience',
  },
]

const steps = [
  {
    number: 1,
    title: 'Sign Up',
    description: 'Create your gym account in minutes',
  },
  {
    number: 2,
    title: 'Add Members',
    description: 'Import or manually add your gym members',
  },
  {
    number: 3,
    title: 'Start Tracking',
    description: 'Track check-ins and monitor your gym analytics',
  },
  {
    number: 4,
    title: 'Grow',
    description: 'Use insights to grow your gym business',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '₱1,500',
    period: '/month',
    description: 'Perfect for small gyms',
    features: [
      'Up to 100 members',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Growth',
    price: '₱3,500',
    period: '/month',
    description: 'For growing gyms',
    features: [
      'Up to 500 members',
      'Advanced analytics',
      'Priority support',
      'Staff management',
    ],
    cta: 'Get Started',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '₱9,000',
    period: '/month',
    description: 'For large gym chains',
    features: [
      'Unlimited members',
      'Custom integrations',
      'Dedicated support',
      'API access',
    ],
    cta: 'Contact Sales',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Gym</span><span className="text-primary">OS</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link
              href="/login"
              className="text-foreground/70 hover:text-foreground transition"
            >
              Gym Login
            </Link>
            <Link
              href="/admin/login"
              className="text-foreground/70 hover:text-foreground transition"
            >
              Admin
            </Link>
            <Button size="sm" asChild className="uppercase tracking-wide rounded-xl opacity-90 hover:opacity-100">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section — dark gradient + grid pattern (visible in light & dark mode) */}
      <section className="relative hero-gradient min-h-[85vh] flex flex-col justify-center overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column — Copy */}
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/90 mb-6">
                New Way to Manage Gyms
              </p>
              <h1 className="font-montserrat text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 text-balance leading-tight tracking-tight">
                <span className="text-white">RUN YOUR GYM</span>
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                  EFFORTLESSLY.
                </span>
              </h1>
              <p className="text-lg text-white/85 mb-10 leading-relaxed">
                Stop juggling spreadsheets. GymOS gives you one powerful platform to manage members, staff, check-ins, and grow your fitness business.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Button
                  size="lg"
                  asChild
                  className="text-base uppercase tracking-wide rounded-xl bg-violet-500 hover:bg-violet-600 text-white border-0 opacity-90 hover:opacity-100"
                >
                  <Link href="/login" className="gap-2">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-base uppercase tracking-wide rounded-xl bg-transparent border-2 border-violet-400/80 text-white hover:bg-white/5 hover:border-violet-300"
                >
                  <Link href="#features">Watch Demo</Link>
                </Button>
              </div>
              <p className="text-sm text-white/60 mt-8">No credit card required. 14-day free trial.</p>
            </div>

            {/* Right Column — Floating cards (light cards on dark hero, visible in both modes) */}
            <div className="relative hidden lg:block h-80">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur border border-white/20 rounded-xl shadow-xl p-5 w-52 animate-float z-10" style={{ animationDelay: '0s' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Check-Ins Today</h3>
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">347</p>
                <p className="text-sm text-emerald-600 mt-1">↑ 12% from yesterday</p>
              </div>
              <div className="absolute right-4 top-6 bg-white/95 backdrop-blur border border-white/20 rounded-xl shadow-xl p-5 w-52 animate-float z-10" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Active Members</h3>
                  <div className="p-2 rounded-lg bg-violet-100">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">2,450</p>
                <p className="text-sm text-violet-600 mt-1">↑ 8% this month</p>
              </div>
              <div className="absolute right-4 bottom-14 bg-white/95 backdrop-blur border border-white/20 rounded-xl shadow-xl p-5 w-48 animate-float z-10" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Monthly Revenue</h3>
                  <div className="p-2 rounded-lg bg-amber-100">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">₱125K</p>
                <p className="text-sm text-amber-600 mt-1">↑ 23% growth</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">
          Powerful Features
        </h2>
        <p className="text-lg text-foreground/60 text-center mb-16 max-w-2xl mx-auto">
          Everything you need to efficiently manage your gym operations
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-8 hover:shadow-md hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-foreground/60 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-foreground/60 text-center mb-12 max-w-2xl mx-auto">
          Get started in just 4 simple steps
        </p>

        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute top-12 left-[calc(50%+2rem)] right-[calc(-100%-2rem)] h-0.5 bg-border" />
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-accent text-accent-foreground font-bold text-2xl mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">
                  {step.title}
                </h3>
                <p className="text-foreground/60 text-sm text-center">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-lg text-foreground/60 text-center mb-16 max-w-2xl mx-auto">
          Choose the perfect plan for your gym
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-xl border transition ${
                plan.featured
                  ? 'border-primary bg-card shadow-lg ring-1 ring-primary/10'
                  : 'border-border bg-card hover:shadow-md'
              } p-8`}
            >
              {plan.featured && (
                <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold mb-2 text-foreground">{plan.name}</h3>
              <p className="text-foreground/60 text-sm mb-6">{plan.description}</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-foreground/60 text-sm">{plan.period}</span>
              </div>
              <Button
                asChild
                className={`w-full mb-8 uppercase tracking-wide rounded-xl opacity-90 hover:opacity-100 ${!plan.featured ? '!bg-transparent' : ''}`}
                variant={plan.featured ? 'default' : 'outline'}
              >
                <Link href="/login">{plan.cta}</Link>
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-foreground/80">
                    <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to Transform Your Gym?
        </h2>
        <p className="text-xl text-foreground/70 mb-8">
          Join hundreds of gym owners using GymOS to streamline their operations
        </p>
        <Button size="lg" asChild className="uppercase tracking-wide rounded-xl opacity-90 hover:opacity-100">
          <Link href="/login" className="gap-2">
            Get Started Today
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Dumbbell className="w-5 h-5 text-primary" />
              <span className="font-semibold">
                <span className="text-foreground">Gym</span><span className="text-primary">OS</span>
              </span>
            </div>
            <p className="text-foreground/60 text-sm">
              © 2024 GymOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
