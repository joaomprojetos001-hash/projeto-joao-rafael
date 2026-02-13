import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        // Trocar o código por uma sessão (isso confirma o email no Supabase)
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Fazer logout imediatamente após confirmar o email
            // O usuário precisa de aprovação do admin antes de acessar o sistema
            await supabase.auth.signOut()

            // Redirecionar para login com mensagem de sucesso
            return NextResponse.redirect(
                `${origin}/login?confirmed=true`
            )
        }
    }

    // Em caso de erro, redirecionar para login com mensagem de erro
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
