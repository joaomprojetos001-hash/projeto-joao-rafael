'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './PipelineLeadModal.module.css'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_ai_active: boolean
    atendente_responsavel?: string
    created_at: string
    is_blocked?: boolean
    produto_interesse?: string
    company_tag?: string
}

interface Props {
    lead: Lead
    onClose: () => void
    onUpdate: (leadId: string, updates: Partial<Lead>) => void
}

export default function PipelineLeadModal({ lead, onClose, onUpdate }: Props) {
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleBlockToggle = async () => {
        setLoading(true)
        const newStatus = !lead.is_blocked

        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ is_blocked: newStatus })
            .eq('id', lead.id)

        if (!error) {
            onUpdate(lead.id, { is_blocked: newStatus })
        } else {
            console.error('Erro ao bloquear lead:', error)
        }
        setLoading(false)
    }

    const handleDeleteLead = async () => {
        setLoading(true)

        const supabase = createClient()

        // 1. Delete messages (Chat History)
        const { error: msgError } = await supabase
            .from('messages')
            .delete()
            .eq('session_id', lead.phone)

        if (msgError) {
            console.error('Erro ao apagar mensagens:', msgError)
        }

        // 2. Delete Agent Memory based on company_tag
        const memoryTable = lead.company_tag === 'PSC_CONSORCIOS'
            ? 'histórico_mensagensconsorcios'
            : 'histórico_mensagens_pscts'

        const { error: memoryError } = await supabase
            .from(memoryTable)
            .delete()
            .eq('session_id', lead.phone)

        if (memoryError) {
            console.error(`Erro ao apagar memória do agente (${memoryTable}):`, memoryError)
        }

        // 3. Delete Lead
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', lead.id)

        if (!error) {
            onClose()
            window.location.reload()
        } else {
            console.error('Erro ao apagar lead:', error)
            alert('Erro ao apagar lead')
        }
        setLoading(false)
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Detalhes do Lead</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <div className={styles.body}>
                    <div className={styles.infoRow}>
                        <div className={styles.avatar}>
                            {lead.name ? lead.name[0].toUpperCase() : '#'}
                        </div>
                        <div>
                            <h3>{lead.name || 'Sem Nome'}</h3>
                            <p className={styles.phone}>{lead.phone}</p>
                        </div>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>Status IA</label>
                            <span className={`${styles.badge} ${lead.is_ai_active ? styles.active : styles.inactive}`}>
                                <span style={{ color: lead.is_ai_active ? 'inherit' : '#2C5AA0' }}>
                                    {lead.is_ai_active ? '🤖 IA Ativa' : '👤 Humano'}
                                </span>
                            </span>
                        </div>

                        <div className={styles.field}>
                            <label>Atendente</label>
                            <p>{lead.atendente_responsavel || 'Não atribuído'}</p>
                        </div>

                        <div className={styles.field}>
                            <label>Início da Conversa</label>
                            <p>{new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={`${styles.blockBtn} ${lead.is_blocked ? styles.unblock : ''}`}
                            onClick={handleBlockToggle}
                            disabled={loading}
                        >
                            {lead.is_blocked ? '🔓 Desbloquear Lead' : '🔒 Bloquear Lead (Parar de receber mensagens)'}
                        </button>

                        <div className={styles.deleteSection}>
                            {!showDeleteConfirm ? (
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={loading}
                                >
                                    🗑️ Apagar Lead
                                </button>
                            ) : (
                                <div className={styles.deleteConfirm}>
                                    <p className={styles.confirmText}>
                                        Tem certeza? Essa ação apagará todos os dados disponíveis sobre esse lead, ele passará a ser reconhecido como um lead "Novo" (sem registros).
                                    </p>
                                    <div className={styles.confirmActions}>
                                        <button
                                            className={styles.cancelDeleteBtn}
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={loading}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            className={styles.confirmDeleteBtn}
                                            onClick={handleDeleteLead}
                                            disabled={loading}
                                        >
                                            {loading ? 'Apagando...' : 'Confirmar Exclusão'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
