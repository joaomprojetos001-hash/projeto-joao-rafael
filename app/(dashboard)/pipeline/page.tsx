'use client'

import { useState, useEffect } from 'react'
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
    { id: 'em_negociacao', title: 'Em Negociação', color: '#f59e0b' },
    { id: 'fechado', title: 'Fechado', color: '#10b981' },
    { id: 'nao_respondido', title: 'Não Respondido', color: '#ef4444' }
]

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

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
        const { data } = await supabase
            .from('leads')
            .select('*')
            .order('updated_at', { ascending: false })

        if (data) setLeads(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchLeads()

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
                <div className={styles.stats}>
                    {leads.length} leads totais
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
                            {col.title} ({leads.filter(l => l.status === col.id).length})
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
                            leads={leads.filter(l => l.status === col.id)}
                            onDragStart={handleDragStart}
                            onViewLead={setSelectedLead}
                            onMoveLead={(leadId) => openMoveModal(leadId)}
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
