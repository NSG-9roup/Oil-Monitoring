import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/reset-password')
  const isProtectedPath =
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/sales')

  // Fast-path: robust scanning for Supabase auth cookie (Temuan #8)
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => 
      cookie.name.includes('supabase') || 
      (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) ||
      cookie.name.endsWith('-auth-token')
    )

  if (!hasSupabaseAuthCookie && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof supabaseResponse.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  if (!user && isProtectedPath && !isAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Centralized RBAC route protection (Temuan #5) & Dynamic login redirection (Temuan #6)
  if (user) {
    const { data: profile } = await supabase
      .from('oil_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // 1. Dynamic login redirection for already authenticated users
    if (pathname === '/login' || pathname === '/reset-password') {
      const url = request.nextUrl.clone()
      if (role === 'admin') url.pathname = '/admin'
      else if (role === 'sales') url.pathname = '/sales'
      else url.pathname = '/dashboard'
      
      return NextResponse.redirect(url)
    }

    // 2. Role-based Access Control (RBAC) route security
    if (isProtectedPath) {
      if (pathname.startsWith('/admin') && role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'sales' ? '/sales' : '/dashboard'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/sales') && role !== 'sales') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'admin' ? '/admin' : '/dashboard'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/dashboard') && role !== 'customer') {
        const url = request.nextUrl.clone()
        url.pathname = role === 'admin' ? '/admin' : '/sales'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
