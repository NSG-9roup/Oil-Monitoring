import { Metadata } from 'next'
import ProfileClient from './ProfileClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Profile | Oil Condition Monitoring',
  description: 'Manage your personal profile and preferences',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch full profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      customers (
        company_name,
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        <ProfileClient initialProfile={profile} userEmail={user.email || ''} />
      </div>
    </div>
  )
}
