import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // 1. Verify the caller is an authenticated admin
        const serverSupabase = await createServerClient()
        const { data: { user } } = await serverSupabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await serverSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }, { status: 403 })
        }

        // 2. Parse form data
        const { name, email, phone, password, role } = await request.json()

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 })
        }

        // 3. Create user with service role key (admin privileges)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Service role key não configurada no servidor.' }, { status: 500 })
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Create auth user (auto-confirms email)
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm since admin is creating
            user_metadata: { name, phone }
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        // 4. Update profile to set approved + role
        if (newUser.user) {
            const { error: profileError } = await adminSupabase
                .from('profiles')
                .update({
                    name,
                    phone: phone || '',
                    role: role || 'agent',
                    is_approved: true
                })
                .eq('id', newUser.user.id)

            if (profileError) {
                console.error('Profile update error:', profileError)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Usuário ${name} criado com sucesso!`,
            userId: newUser.user?.id
        })
    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
