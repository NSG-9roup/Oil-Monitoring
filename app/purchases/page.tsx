import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PurchaseClient from './PurchaseClient'

export default async function PurchasesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('oil_profiles')
    .select('*, customer:oil_customers(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Only customers and sales can access purchases page
  if (profile.role !== 'customer' && profile.role !== 'sales') {
    redirect('/dashboard')
  }

  return <PurchaseClient user={user} profile={profile} />
}
