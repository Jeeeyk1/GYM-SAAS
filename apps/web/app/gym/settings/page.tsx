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

const gymSettingsSchema = z.object({
  gymName: z.string().min(1, 'Gym name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
})

type GymSettingsFormValues = z.infer<typeof gymSettingsSchema>

export default function SettingsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<GymSettingsFormValues>({
    resolver: zodResolver(gymSettingsSchema),
    defaultValues: {
      gymName: 'CrossFit Elite',
      email: 'admin@crossfitelite.com',
      phone: '(555) 123-4567',
      city: 'New York',
      state: 'NY',
    },
  })

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    setIsLoading(false)
  }, [token, router])

  const onSubmit = async (values: GymSettingsFormValues) => {
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
      <Sidebar gymName={user?.gymName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-8 py-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-foreground/60">Manage your gym information</p>
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

              {/* Gym Information */}
              <div className="bg-card border border-border rounded-lg p-8">
                <h2 className="text-xl font-semibold mb-6">Gym Information</h2>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="gymName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gym Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
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

              {/* Danger Zone */}
              <div className="bg-card border border-destructive rounded-lg p-8 mt-8">
                <h2 className="text-xl font-semibold mb-4 text-destructive">
                  Danger Zone
                </h2>
                <p className="text-foreground/60 mb-4">
                  Irreversible and destructive actions
                </p>
                <Button variant="destructive">
                  Delete Gym Account
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
