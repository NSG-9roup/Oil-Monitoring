import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompareMachinesClient from './CompareMachinesClient'

export const metadata = {
  title: 'Perbandingan Mesin | OilTrack™',
  description: 'Bandingkan kondisi oli beberapa mesin secara side-by-side',
}

export default async function CompareMachinesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('oil_profiles')
    .select('*, customer:oil_customers(*)')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: machines = [] } = await supabase
    .from('oil_machines')
    .select('id, machine_name, model, location, status')
    .eq('customer_id', profile.customer_id)
    .order('machine_name')

  return <CompareMachinesClient machines={machines ?? []} language={profile.language ?? 'id'} />
}
