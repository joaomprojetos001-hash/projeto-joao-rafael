'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'

interface LogEntry {
    id: string
    created_at: string
    message: string
    type: 'INFO' | 'WARN' | 'SUCCESS'
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLogs = async () => {
            const supabase = createClient()

            // Fetch recent leads as "Activity"
            const { data: leads } = await supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(20)

            if (leads) {
                const activityLogs: LogEntry[] = leads.map(l => ({
                    id: l.id,
                    created_at: l.updated_at,
                    message: `Lead ${l.name || l.phone} atualizado para status: ${l.status}`,
                    type: l.status === 'fechado' ? 'SUCCESS' : 'INFO'
                }))
                setLogs(activityLogs)
            }
            setLoading(false)
        }
        fetchLogs()
    }, [])

    if (loading) return <div className={styles.loading}>Carregando logs...</div>

    return (
        <div className={styles.statCard}>
            <h2>📜 Atividade Recente do Sistema</h2>
            <div style={{ marginTop: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Data</th>
                            <th style={{ padding: '10px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Tipo</th>
                            <th style={{ padding: '10px', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Mensagem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                                <td style={{ padding: '10px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        color: log.type === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-info)',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {log.type}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
