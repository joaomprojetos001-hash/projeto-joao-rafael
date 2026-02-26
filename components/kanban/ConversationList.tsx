'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import styles from './ConversationList.module.css'
import { useCompany } from '@/context/CompanyContext'
import { Search, Check, X } from 'lucide-react'

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
            const { data: { user } } = await supabase.auth.getUser()

            let allowedProductIds: string[] = []
            let isAdmin = false

            if (user) {
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

            let query = supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })

            const { data, error } = await query

            if (data) {
                const visibleLeads = data.filter(lead => {
                    if (isAdmin) return true
                    if (lead.is_urgent) return true
                    if (lead.produto_interesse && allowedProductIds.includes(lead.produto_interesse)) return true
                    return false
                })

                setLeads(visibleLeads)

                if (urlLeadId && !selectedLeadId) {
                    const targetLead = visibleLeads.find(l => l.id === urlLeadId)
                    if (targetLead) onSelectLead(urlLeadId)
                }
            }
            setLoading(false)
        }

        fetchLeads()

        const supabase = createClient()
        const leadsChannel = supabase
            .channel('leads-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
                () => fetchLeads()
            )
            .subscribe()

        const messagesChannel = supabase
            .channel('messages-list')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                () => fetchLeads()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(leadsChannel)
            supabase.removeChannel(messagesChannel)
        }
    }, [])

    useEffect(() => {
        const fetchHumanAttendedLeads = async () => {
            if (leads.length === 0) return

            const supabase = createClient()
            const phonesToCheck = leads.map(l => l.phone)

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

    const isUnread = (lead: Lead): boolean => {
        const lastRead = readLeads[lead.id]
        if (!lastRead) return true
        return new Date(lead.updated_at) > new Date(lastRead)
    }

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            (lead.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.phone || '').includes(searchTerm)

        if (!matchesSearch) return false

        if (filter === 'urgent') return lead.is_urgent
        if (filter === 'active') return lead.status === 'em_atendimento' || lead.status === 'em_negociacao'
        return true
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'em_atendimento': return 'linear-gradient(135deg, #4A90E2 0%, #2C5AA0 100%)'
            case 'nao_respondido': return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
            case 'em_negociacao': return 'linear-gradient(135deg, #F6AD55 0%, #ED8936 100%)'
            case 'fechado': return 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)'
            case 'venda_perdida': return 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
            default: return 'linear-gradient(135deg, #718096 0%, #4A5568 100%)'
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Conversas</h3>

                <div className={styles.searchContainer}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Buscar lead ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
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
                    <button
                        className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Ativos
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {loading ? (
                    <div className={styles.loading}>Carregando conversas...</div>
                ) : (
                    filteredLeads.map(lead => (
                        <div
                            key={lead.id}
                            className={`${styles.item} ${selectedLeadId === lead.id ? styles.selected : ''}`}
                            onClick={() => handleSelectLead(lead.id)}
                        >
                            <div className={styles.avatarWrapper}>
                                <div
                                    className={styles.avatar}
                                    style={{ background: getStatusColor(lead.status) }}
                                >
                                    {lead.name ? lead.name[0].toUpperCase() : '#'}
                                </div>
                                <div
                                    className={styles.statusDot}
                                    data-status={lead.is_urgent ? 'urgent' : lead.status === 'nao_respondido' ? 'inactive' : 'active'}
                                />
                            </div>

                            <div className={styles.leadInfo}>
                                <div className={styles.leadHeader}>
                                    <span className={styles.leadName}>{lead.name || lead.phone}</span>
                                    <span className={styles.time}>
                                        {format(new Date(lead.updated_at), 'HH:mm')}
                                    </span>
                                </div>

                                <div className={styles.leadDetails}>
                                    <span className={styles.preview}>
                                        {(lead.status || 'sem status').replace('_', ' ')}
                                    </span>
                                    <div className={styles.badges}>
                                        {lead.atendente_responsavel && (
                                            <span title={lead.atendente_responsavel} style={{ fontSize: '0.8rem' }}>👤</span>
                                        )}
                                        {humanAttendedLeads.has(lead.id) ? (
                                            <Check className={styles.attended} size={14} />
                                        ) : (
                                            <X className={styles.notAttended} size={14} />
                                        )}
                                        {lead.company_tag && (
                                            <span className={`${styles.companyBadge} ${lead.company_tag === 'PSC_CONSORCIOS' ? styles.badgePsc : styles.badgeTs}`}>
                                                {lead.company_tag === 'PSC_CONSORCIOS' ? 'PSC' : 'P+T'}
                                            </span>
                                        )}
                                        {lead.is_urgent && <span className={styles.urgentBadge}>!</span>}
                                        {isUnread(lead) && <span className={styles.unreadBadge}></span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
