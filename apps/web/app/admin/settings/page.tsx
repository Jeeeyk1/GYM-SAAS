'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AlertCircle, Settings as SettingsIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'

const adminSettingsSchema = z.object({
  platformName: z.string().min(1, 'Platform name is required'),
  adminEmail: z.string().email('Invalid email'),
  supportEmail: z.string().email('Invalid email'),
  contactPhone: z.string().min(10, 'Phone must be at least 10 digits'),
})

type AdminSettingsFormValues = z.infer<typeof adminSettingsSchema>

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<AdminSettingsFormValues>({
    resolver: zodResolver(adminSettingsSchema),
    defaultValues: {
      platformName: 'GymPulse',
      adminEmail: 'admin@gympulse.com',
      supportEmail: 'support@gympulse.com',
      contactPhone: '(555) 999-9999',
    },
  })

  useEffect(() => {
    if (!token) {
      router.push('/admin/login')
      return
    }

    if (user?.role !== 'admin') {
      router.push('/gym/dashboard')
      return
    }

    setIsLoading(false)
  }, [token, user, router])

  const onSubmit = async (values: AdminSettingsFormValues) => {
    setIsSaving(true)
    setSuccess(false)
    
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-8 py-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold">Platform Settings</h1>
              <p className="text-foreground/60">Manage platform-wide configuration</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="max-w-2xl">
              {success && (
                <Alert className="mb-6 bg-green-500/10 border-green-500/20">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-500">
                    Settings saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Platform Information */}
              <div className="bg-card border border-border rounded-lg p-8">
                <h2 className="text-xl font-semibold mb-6">Platform Information</h2>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="platformName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supportEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>

              {/* System Information */}
              <div className="bg-card border border-border rounded-lg p-8 mt-8">
                <h2 className="text-xl font-semibold mb-6">System Information</h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-foreground/60">Version</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-foreground/60">Status</span>
                    <span className="font-medium text-accent">Active</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-foreground/60">Last Updated</span>
                    <span className="font-medium">March 1, 2024</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
