'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'
import UserDetailModal from './UserDetailModal'

interface AgentStats {
    id: string
    name: string
    totalLeads: number
    closedLeads: number
    responseTime: string
}

export default function AdminAgents() {
    const [agents, setAgents] = useState<AgentStats[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        const fetchAgents = async () => {
            const supabase = createClient()

            // 1. Get Agents
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'agent')

            // 2. Get All Leads
            const { data: leads } = await supabase
                .from('leads')
                .select('*')

            if (profiles && leads) {
                const stats = profiles.map(profile => {
                    // Placeholder logic - ideally link leads by assignee if possible
                    return {
                        id: profile.id,
                        name: profile.name,
                        totalLeads: 0,
                        closedLeads: 0,
                        responseTime: '-'
                    }
                })
                setAgents(stats)
            }
            setLoading(false)
        }
        fetchAgents()
    }, [])

    if (loading) return <div>Carregando agentes...</div>

    return (
        <div className={styles.container} style={{ padding: 0 }}>
            {selectedAgent && (
                <UserDetailModal
                    userId={selectedAgent}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={() => {
                        // Refresh logic if needed
                        setIsModalOpen(false)
                    }}
                />
            )}

            <h2 className={styles.subtitle}>Performance da Equipe</h2>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Agente</th>
                            <th>Leads Ativos</th>
                            <th>Fechados</th>
                            <th>Tempo Resp.</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map(agent => (
                            <tr key={agent.id}>
                                <td><strong>{agent.name}</strong></td>
                                <td>{agent.totalLeads}</td>
                                <td>{agent.closedLeads}</td>
                                <td>{agent.responseTime}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => {
                                            setSelectedAgent(agent.id)
                                            setIsModalOpen(true)
                                        }}
                                        style={{
                                            background: 'var(--color-bg-secondary)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                    >
                                        Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
