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
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Mensagem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td data-label="Data">
                                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </td>
                                <td data-label="Tipo">
                                    <span className={log.type === 'SUCCESS' ? styles.badgeSuccess : styles.badgeWarning}>
                                        {log.type}
                                    </span>
                                </td>
                                <td data-label="Mensagem">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
