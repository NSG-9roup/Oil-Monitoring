import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const allowedRoles = ['customer', 'admin', 'sales'] as const

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAdminProfile(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Route handlers only need read access here.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: jsonError('Unauthorized', 401) }
  }

  const { data: profile, error } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return { error: jsonError('Forbidden', 403) }
  }

  return { user, profile }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAdminProfile(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const body = await request.json()
    const { action, userId, email, password, full_name, contact_email, phone_number, role, customer_id } = body

    if (typeof action !== 'string') {
      return jsonError('Invalid action', 400)
    }

    if (action === 'create') {
      if (typeof email !== 'string' || typeof password !== 'string' || typeof full_name !== 'string' || typeof role !== 'string') {
        return jsonError('Missing required fields', 400)
      }

      if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
        return jsonError('Invalid role', 400)
      }

      if (role === 'customer' && typeof customer_id !== 'string') {
        return jsonError('customer_id is required for customer users', 400)
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) throw authError

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('oil_profiles')
        .insert([{
          id: authData.user.id,
          full_name,
          email: contact_email || null,
          phone_number: phone_number || null,
          role,
          customer_id: role === 'customer' ? customer_id : null,
        }])

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      return NextResponse.json({ success: true, user: authData.user })
    } else if (action === 'delete') {
      if (typeof userId !== 'string') {
        return jsonError('userId is required', 400)
      }

      // Delete user from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authError) throw authError

      return NextResponse.json({ success: true })
    } else if (action === 'update') {
      if (typeof userId !== 'string' || typeof full_name !== 'string' || typeof role !== 'string') {
        return jsonError('Missing required fields', 400)
      }

      if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
        return jsonError('Invalid role', 400)
      }

      // Update profile only (can't update auth email easily)
      const { error } = await supabaseAdmin
        .from('oil_profiles')
        .update({
          full_name,
          email: contact_email || null,
          phone_number: phone_number || null,
          role,
          customer_id: role === 'customer' ? customer_id : null,
        })
        .eq('id', userId)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('User management error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}
