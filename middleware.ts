import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Permitir arquivos estáticos e API
    if (
        pathname.includes('.') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/assets')
    ) {
        return NextResponse.next()
    }

    // 2. Atualizar sessão Supabase
    let response = await updateSession(request)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 3. Redirecionamento de Proteção
    const isLoginPage = pathname === '/login'
    const isRegisterPage = pathname === '/register'

    console.log(`[Middleware] Path: ${pathname}, User: ${!!user}, IsLogin: ${isLoginPage}, IsRegister: ${isRegisterPage}`)

    if (!user && !isLoginPage && !isRegisterPage) {
        console.log('[Middleware] Redirecting to /login (Protected Route)')
        // Se não tem usuário e tenta acessar página protegida -> Login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 4. Verificar se o usuário foi aprovado pelo admin
    if (user && !isLoginPage && !isRegisterPage) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', user.id)
            .single()

        if (profile && !profile.is_approved) {
            console.log('[Middleware] User not approved, signing out and redirecting to /login')
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'not_approved')
            return NextResponse.redirect(url)
        }
    }

    if (user && (isLoginPage || isRegisterPage)) {
        console.log('[Middleware] Redirecting to /dashboard (Already Authenticated)')
        // Se tem usuário e tenta acessar login ou register -> Dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
