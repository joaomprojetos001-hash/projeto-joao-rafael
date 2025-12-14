'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import styles from './ConversationList.module.css'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_urgent: boolean
    updated_at: string
    atendente_responsavel?: string
}

interface Props {
    selectedLeadId: string | null
    onSelectLead: (id: string) => void
}

export default function ConversationList({ selectedLeadId, onSelectLead }: Props) {
    const searchParams = useSearchParams()
    const urlLeadId = searchParams.get('leadId')
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, urgent, active
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchLeads = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })

            if (data) {
                setLeads(data)
                // Se houver lead na URL e nenhum selecionado, selecionar ele
                if (urlLeadId && !selectedLeadId) {
                    const targetLead = data.find(l => l.id === urlLeadId)
                    if (targetLead) onSelectLead(urlLeadId)
                }
            }
            setLoading(false)
        }

        fetchLeads()

        // Realtime subscription
        const supabase = createClient()
        const channel = supabase
            .channel('leads-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
                () => fetchLeads()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const filteredLeads = leads.filter(lead => {
        // Search Filter
        const matchesSearch =
            (lead.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.phone || '').includes(searchTerm)

        if (!matchesSearch) return false

        // Status Filter
        if (filter === 'urgent') return lead.is_urgent
        if (filter === 'active') return lead.status === 'em_atendimento' || lead.status === 'em_negociacao'
        return true
    })

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Conversas</h3>

                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)'
                        }}
                    />
                </div>

                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'urgent' ? styles.active : ''}`}
                        onClick={() => setFilter('urgent')}
                    >
                        Urgentes
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {loading ? (
                    <div className={styles.loading}>Carregando...</div>
                ) : (
                    filteredLeads.map(lead => (
                        <div
                            key={lead.id}
                            className={`${styles.item} ${selectedLeadId === lead.id ? styles.selected : ''}`}
                            onClick={() => onSelectLead(lead.id)}
                        >
                            <div className={styles.avatar}>
                                {lead.name ? lead.name[0].toUpperCase() : '#'}
                            </div>
                            <div className={styles.leadInfo}>
                                <div className={styles.leadHeader}>
                                    <span className={styles.leadName}>{lead.name || lead.phone}</span>
                                </div>
                                {lead.atendente_responsavel && (
                                    <span style={{ fontSize: '0.75rem', color: '#6366f1', display: 'block', marginBottom: '2px' }}>
                                        👤 {lead.atendente_responsavel}
                                    </span>
                                )}
                                <div className={styles.leadStatus}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.preview}>
                                            {lead.status.replace('_', ' ')}
                                        </span>
                                        <span className={styles.leadTime}>
                                            {format(new Date(lead.updated_at), 'HH:mm')}
                                        </span>
                                    </div>
                                    {lead.is_urgent && (
                                        <span className={styles.urgentBadge}>!</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
