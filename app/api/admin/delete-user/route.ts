import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // 1. Verificar se o chamador é um admin autenticado
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
            return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' }, { status: 403 })
        }

        // 2. Extrair o ID do usuário a ser removido
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 })
        }

        // Evitar que um admin se exclua (opcional, mas recomendado)
        if (userId === user.id) {
            return NextResponse.json({ error: 'Você não pode excluir sua própria conta por segurança.' }, { status: 400 })
        }

        // 2. Criar cliente com service role key (privilégios de admin)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Service role key não configurada no servidor.' }, { status: 500 })
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 3. Remover usuário do Auth (isso deve disparar o cascade ou limpamos o profile manualmente)
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Auth delete error:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 400 })
        }

        // 4. Garantir que o perfil foi removido (caso não haja cascade)
        await adminSupabase
            .from('profiles')
            .delete()
            .eq('id', userId)

        return NextResponse.json({
            success: true,
            message: `Usuário removido com sucesso!`
        })
    } catch (error: any) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
