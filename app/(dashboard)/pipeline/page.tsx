'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PipelineColumn from '@/components/pipeline/PipelineColumn'
import PipelineLeadModal from '@/components/pipeline/PipelineLeadModal'
import styles from './pipeline.module.css'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_urgent: boolean
    produto_interesse: string
    updated_at: string
    is_ai_active: boolean
    atendente_responsavel?: string
    created_at: string
    is_blocked?: boolean
}

const COLUMNS = [
    { id: 'em_atendimento', title: 'Em Atendimento', color: '#6366f1' },
    { id: 'nao_respondido', title: 'Não Respondido', color: '#ef4444' },
    { id: 'em_negociacao', title: 'Em Negociação', color: '#f59e0b' },
    { id: 'fechado', title: 'Fechado', color: '#10b981' },
    { id: 'venda_perdida', title: 'Venda Perdida', color: '#71717a' }
]

interface Product {
    id: string
    nome: string
}

export default function PipelinePage() {
    const router = useRouter()
    const [leads, setLeads] = useState<Lead[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [lastMessages, setLastMessages] = useState<Record<string, string>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [sortOrder, setSortOrder] = useState('chegada_desc')

    const SORT_OPTIONS = [
        { value: 'chegada_desc', label: '📅 Mais recentes primeiro' },
        { value: 'chegada_asc', label: '📅 Mais antigos primeiro' },
        { value: 'atualizacao', label: '🔄 Última atualização' },
        { value: 'nome_az', label: '🔤 Nome A–Z' },
        { value: 'nome_za', label: '🔤 Nome Z–A' },
        { value: 'urgente', label: '🚨 Urgentes primeiro' },
    ]

    // Filter leads by search term (name or phone)
    const filteredLeads = useMemo(() => {
        if (!searchTerm.trim()) return leads
        const term = searchTerm.toLowerCase().trim()
        return leads.filter(lead =>
            (lead.name?.toLowerCase() || '').includes(term) ||
            (lead.phone || '').includes(term)
        )
    }, [leads, searchTerm])

    // Sort filtered leads based on selected order
    const sortedLeads = useMemo(() => {
        const sorted = [...filteredLeads]
        switch (sortOrder) {
            case 'chegada_desc':
                sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                break
            case 'chegada_asc':
                sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                break
            case 'atualizacao':
                sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                break
            case 'nome_az':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
                break
            case 'nome_za':
                sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'))
                break
            case 'urgente':
                sorted.sort((a, b) => {
                    if (a.is_urgent && !b.is_urgent) return -1
                    if (!a.is_urgent && b.is_urgent) return 1
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
                break
        }
        return sorted
    }, [filteredLeads, sortOrder])

    const handleUpdateLead = (leadId: string, updates: Partial<Lead>) => {
        setLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, ...updates } : l
        ))
        if (selectedLead && selectedLead.id === leadId) {
            setSelectedLead(prev => prev ? { ...prev, ...updates } : null)
        }
    }

    const fetchLeads = async () => {
        const supabase = createClient()

        // 1. Get Access Control Data
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

        // 2. Fetch All Leads
        const { data } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            // 3. Filter Leads
            const visibleLeads = data.filter(lead => {
                if (isAdmin) return true
                const isUrgent = (lead as any).is_urgent === true
                if (isUrgent) return true

                if (lead.produto_interesse && allowedProductIds.includes(lead.produto_interesse)) return true

                return false
            })
            setLeads(visibleLeads)

            // Fetch last human message for each lead
            const uniquePhones = [...new Set(visibleLeads.map(l => l.phone))]
            if (uniquePhones.length > 0) {
                const messagesMap: Record<string, string> = {}
                // Fetch in batches to avoid too many queries
                const batchSize = 50
                for (let i = 0; i < uniquePhones.length; i += batchSize) {
                    const batch = uniquePhones.slice(i, i + batchSize)
                    const { data: msgs } = await supabase
                        .from('messages')
                        .select('session_id, message')
                        .in('session_id', batch)
                        .contains('message', { type: 'human' })
                        .order('created_at', { ascending: false })

                    if (msgs) {
                        msgs.forEach(m => {
                            // Only keep the first (most recent) message per session
                            if (!messagesMap[m.session_id] && m.message?.content) {
                                const content = m.message.content
                                messagesMap[m.session_id] = typeof content === 'string'
                                    ? content.substring(0, 100)
                                    : ''
                            }
                        })
                    }
                }
                setLastMessages(messagesMap)
            }
        }
    }

    const fetchProducts = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('produtos')
            .select('id, nome')
            .order('nome', { ascending: true })

        if (data) setProducts(data)
    }

    const initData = async () => {
        setLoading(true)
        await Promise.all([fetchLeads(), fetchProducts()])
        setLoading(false)
    }

    useEffect(() => {
        initData()

        const supabase = createClient()
        const channel = supabase
            .channel('pipeline-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
                () => fetchLeads()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId)
    }

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        const leadId = e.dataTransfer.getData('leadId')
        if (!leadId) return

        // Atualização Otimista
        setLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, status: newStatus } : l
        ))

        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId)

        if (error) {
            console.error('Erro ao mover card:', error)
            fetchLeads() // Reverte em caso de erro
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    // Mobile Move Logic
    const [moveModalLeadId, setMoveModalLeadId] = useState<string | null>(null)

    const openMoveModal = (leadId: string) => {
        setMoveModalLeadId(leadId)
    }

    const handleMobileMove = async (newStatus: string) => {
        if (!moveModalLeadId) return

        // Reuse handleDrop logic basically
        // Optimistic
        setLeads(prev => prev.map(l =>
            l.id === moveModalLeadId ? { ...l, status: newStatus } : l
        ))

        setMoveModalLeadId(null) // Close modal immediately

        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', moveModalLeadId)

        if (error) {
            console.error('Erro ao mover (mobile):', error)
            fetchLeads()
        }
    }

    const [activeColumn, setActiveColumn] = useState('em_atendimento')

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Pipeline de Vendas</h1>
                <div className={styles.headerRight}>
                    <div className={styles.searchContainer}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchTerm && (
                            <button
                                className={styles.searchClear}
                                onClick={() => setSearchTerm('')}
                                title="Limpar busca"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <select
                        className={styles.sortSelect}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        title="Ordenar leads"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className={styles.stats}>
                        {sortedLeads.length}{searchTerm ? `/${leads.length}` : ''} leads
                    </div>
                </div>
            </div>

            {/* Mobile Column Selector (Dropdown) */}
            <div className={styles.mobileActions}>
                <select
                    className={styles.columnSelect}
                    value={activeColumn}
                    onChange={(e) => setActiveColumn(e.target.value)}
                >
                    {COLUMNS.map(col => (
                        <option key={col.id} value={col.id}>
                            {col.title} ({sortedLeads.filter(l => l.status === col.id).length})
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.board}>
                {COLUMNS.map(col => (
                    <div
                        key={col.id}
                        className={`${styles.columnWrapper} ${activeColumn === col.id ? styles.activeColumn : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <PipelineColumn
                            title={col.title}
                            color={col.color}
                            leads={sortedLeads.filter(l => l.status === col.id)}
                            products={products}
                            lastMessages={lastMessages}
                            onDragStart={handleDragStart}
                            onViewLead={setSelectedLead}
                            onMoveLead={(leadId) => openMoveModal(leadId)}
                            onGoToConversation={(leadId) => router.push(`/kanban?leadId=${leadId}`)}
                        />
                    </div>
                ))}
            </div>

            {selectedLead && (
                <PipelineLeadModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={handleUpdateLead}
                />
            )}

            {/* Mobile Move Status Modal */}
            {moveModalLeadId && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setMoveModalLeadId(null)}
                >
                    <div
                        style={{
                            background: 'var(--color-surface)', padding: '2rem',
                            borderRadius: '1rem', width: '90%', maxWidth: '300px',
                            display: 'flex', flexDirection: 'column', gap: '1rem'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3>Mover para...</h3>
                        {COLUMNS.map(col => (
                            <button
                                key={col.id}
                                style={{
                                    padding: '1rem', border: `1px solid ${col.color}`,
                                    borderRadius: '0.5rem', background: 'transparent',
                                    color: 'var(--color-text-primary)', fontWeight: 600
                                }}
                                onClick={() => handleMobileMove(col.id)}
                            >
                                {col.title}
                            </button>
                        ))}
                        <button
                            onClick={() => setMoveModalLeadId(null)}
                            style={{ padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
