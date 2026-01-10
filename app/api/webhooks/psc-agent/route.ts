import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { session_id, message, phone, content, type } = body

        // Normalize input
        // Accepts:
        // 1. { session_id: "...", message: { type: "...", content: "..." } } (Standard Schema)
        // 2. { phone: "...", content: "...", type: "..." } (Simplified Agent Input)

        const targetPhone = session_id || phone
        const targetContent = message?.content || content
        const targetType = message?.type || type || 'ai' // Default to AI as this is the "memoria do agente"

        if (!targetPhone || !targetContent) {
            return NextResponse.json(
                { error: 'Missing required fields: session_id/phone and message/content' },
                { status: 400 }
            )
        }

        // Initialize Supabase Client (Standard client is sufficient as RLS is disabled for messages)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Prepare payload
        const dbPayload = {
            session_id: targetPhone,
            message: {
                type: targetType,
                content: targetContent,
                metadata: {
                    origin: 'psc_consorcios_agent',
                    timestamp: new Date().toISOString()
                }
            },
            company_tag: 'PSC_CONSORCIOS'
        }

        // Insert into messages
        const { data, error } = await supabase
            .from('messages')
            .insert(dbPayload)
            .select()

        if (error) {
            console.error('Error inserting message from PSC Agent:', error)
            return NextResponse.json(
                { error: 'Failed to insert message', details: error.message },
                {
                    status: 500,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    }
                }
            )
        }

        return NextResponse.json(
            { success: true, data },
            {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        )

    } catch (err: any) {
        console.error('Webhook Unexpected Error:', err)
        return NextResponse.json(
            { error: 'Internal Server Error', details: err.message },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        )
    }
}

export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
