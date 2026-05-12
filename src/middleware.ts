import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  if (!user && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (!user) return supabaseResponse

  const userId = user.id
  const userEmail = user.email ?? null

  if (path.startsWith('/dashboard')) {
    // Admin page: Tyler only
    if (path === '/dashboard/admin' || path === '/dashboard/admin/') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const isTyler = userEmail === 'tyler.dubuque@gmail.com'
      if (profile?.role !== 'admin' && !isTyler) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Manager "My Team" page: manager or admin only
    if (path === '/dashboard/manager' || path === '/dashboard/manager/') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'manager' && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
