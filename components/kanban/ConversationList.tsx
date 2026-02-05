'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import styles from './ConversationList.module.css'
import { useCompany } from '@/context/CompanyContext'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_urgent: boolean
    updated_at: string
    atendente_responsavel?: string
    company_tag?: string
}

interface Props {
    selectedLeadId: string | null
    onSelectLead: (id: string) => void
}

// LocalStorage key for tracking read leads
const READ_LEADS_KEY = 'kanban_read_leads'

export default function ConversationList({ selectedLeadId, onSelectLead }: Props) {
    const searchParams = useSearchParams()
    const urlLeadId = searchParams.get('leadId')
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, urgent, active
    const [searchTerm, setSearchTerm] = useState('')

    // Track which leads have been attended by a human
    const [humanAttendedLeads, setHumanAttendedLeads] = useState<Set<string>>(new Set())
    // Track last read timestamp per lead
    const [readLeads, setReadLeads] = useState<Record<string, string>>({})

    const { selectedCompany } = useCompany()

    // Load read leads from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(READ_LEADS_KEY)
            if (stored) {
                setReadLeads(JSON.parse(stored))
            }
        } catch (e) {
            console.error('Error loading read leads from localStorage:', e)
        }
    }, [])

    useEffect(() => {
        const fetchLeads = async () => {
            const supabase = createClient()

            // 1. Get Current User
            const { data: { user } } = await supabase.auth.getUser()

            let allowedProductIds: string[] = []
            let isAdmin = false

            if (user) {
                // 2. Get Profile & Products
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    isAdmin = true
                } else {
                    const { data: userProducts } = await supabase
                        .from('user_products')
                        .select('product_id')
                        .eq('user_id', user.id)

                    if (userProducts) {
                        allowedProductIds = userProducts.map(up => up.product_id)
                    }
                }
            }

            // 3. Fetch Leads
            let query = supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })

            // Removed Global Company Filter to showing all leads in Kanban regardless of Dashboard selection
            // if (selectedCompany !== 'ALL') {
            //    query = query.eq('company_tag', selectedCompany)
            // }

            const { data, error } = await query

            if (data) {
                // 4. Apply Access Control Filter
                const visibleLeads = data.filter(lead => {
                    // Admin sees all
                    if (isAdmin) return true
                    // Urgent leads visible to all
                    if (lead.is_urgent) return true
                    // Lead matches one of user's products
                    if (lead.produto_interesse && allowedProductIds.includes(lead.produto_interesse)) return true

                    return false
                })

                setLeads(visibleLeads)

                // Keep selection if visible
                if (urlLeadId && !selectedLeadId) {
                    const targetLead = visibleLeads.find(l => l.id === urlLeadId)
                    if (targetLead) onSelectLead(urlLeadId)
                }
            }
            setLoading(false)
        }

        fetchLeads()

        // Realtime subscription for leads
        const supabase = createClient()
        const leadsChannel = supabase
            .channel('leads-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
                () => fetchLeads()
            )
            .subscribe()

        // Realtime subscription for messages - to update unread badges
        const messagesChannel = supabase
            .channel('messages-list')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                () => fetchLeads() // Refetch to update updated_at order and unread status
            )
            .subscribe()

        return () => {
            supabase.removeChannel(leadsChannel)
            supabase.removeChannel(messagesChannel)
        }
    }, []) // Removed selectedCompany dependency

    // Fetch human-attended leads (leads with messages from dashboard_human)
    useEffect(() => {
        const fetchHumanAttendedLeads = async () => {
            if (leads.length === 0) return

            const supabase = createClient()
            const phonesToCheck = leads.map(l => l.phone)

            // Query messages where metadata.origin = 'dashboard_human'
            const { data: humanMessages } = await supabase
                .from('messages')
                .select('session_id')
                .in('session_id', phonesToCheck)
                .contains('message', { metadata: { origin: 'dashboard_human' } })

            if (humanMessages) {
                const attendedPhones = new Set(humanMessages.map(m => m.session_id))
                const attendedLeadIds = new Set(
                    leads.filter(l => attendedPhones.has(l.phone)).map(l => l.id)
                )
                setHumanAttendedLeads(attendedLeadIds)
            }
        }

        fetchHumanAttendedLeads()
    }, [leads])

    // Mark lead as read when selected
    const handleSelectLead = (leadId: string) => {
        const lead = leads.find(l => l.id === leadId)
        if (lead) {
            const newReadLeads = {
                ...readLeads,
                [leadId]: lead.updated_at
            }
            setReadLeads(newReadLeads)
            localStorage.setItem(READ_LEADS_KEY, JSON.stringify(newReadLeads))
        }
        onSelectLead(leadId)
    }

    // Check if lead has unread messages
    const isUnread = (lead: Lead): boolean => {
        const lastRead = readLeads[lead.id]
        if (!lastRead) return true // Never read = unread
        return new Date(lead.updated_at) > new Date(lastRead)
    }

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
                            onClick={() => handleSelectLead(lead.id)}
                        >
                            <div
                                className={styles.avatar}
                                data-status={
                                    lead.status === 'em_atendimento' ? 'Em Atendimento' :
                                        lead.status === 'nao_respondido' ? 'Não Respondido' :
                                            lead.status === 'em_negociacao' ? 'Em Negociação' :
                                                lead.status === 'fechado' ? 'Fechado' :
                                                    lead.status === 'venda_perdida' ? 'Venda Perdida' : ''
                                }
                            >
                                {lead.name ? lead.name[0].toUpperCase() : '#'}
                            </div>
                            <div className={styles.leadInfo}>
                                <div className={styles.leadHeader}>
                                    <span className={styles.leadName}>{lead.name || lead.phone}</span>
                                    {/* Human Attended Badge - only for em_negociacao with human response */}
                                    {lead.status === 'em_negociacao' && humanAttendedLeads.has(lead.id) && (
                                        <span className={styles.humanAttendedBadge} title="Atendido por humano">✓</span>
                                    )}
                                    {lead.company_tag && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            backgroundColor: lead.company_tag === 'PSC_CONSORCIOS' ? '#10b981' : '#d4af37',
                                            color: 'white',
                                            marginLeft: '6px'
                                        }}>
                                            {lead.company_tag === 'PSC_CONSORCIOS' ? 'PSC' : 'PSC+TS'}
                                        </span>
                                    )}
                                    {/* Unread Badge */}
                                    {isUnread(lead) && (
                                        <span className={styles.unreadBadge} title="Conversa não lida"></span>
                                    )}
                                </div>
                                {lead.atendente_responsavel && (
                                    <span style={{ fontSize: '0.75rem', color: '#6366f1', display: 'block', marginBottom: '2px' }}>
                                        👤 {lead.atendente_responsavel}
                                    </span>
                                )}
                                <div className={styles.leadStatus}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.preview}>
                                            {(lead.status || 'sem status').replace('_', ' ')}
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
