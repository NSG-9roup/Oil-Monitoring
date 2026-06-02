import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (error) {
    console.error('SUPABASE GETSESSION ERROR IN ROOT PAGE:', error)
  }

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  if (profile?.role === 'sales') {
    redirect('/sales')
  }

  if (profile?.role === 'customer') {
    redirect('/dashboard')
  }

  redirect('/login')
}
