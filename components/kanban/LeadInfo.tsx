'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './LeadInfo.module.css'

interface LeadInfoProps {
    leadId: string
}

export default function LeadInfo({ leadId }: LeadInfoProps) {
    const [lead, setLead] = useState<any>(null)

    useEffect(() => {
        const fetchLead = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single()

            if (data) setLead(data)
        }
        fetchLead()
    }, [leadId])

    const handleToggleAI = async () => {
        if (!lead) return

        const newValue = !lead.is_ai_active

        // Atualiza estado local imediatamente (otimista)
        setLead({ ...lead, is_ai_active: newValue })

        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ is_ai_active: newValue })
            .eq('id', leadId)

        if (error) {
            // Reverte em caso de erro
            setLead({ ...lead, is_ai_active: !newValue })
            console.error('Erro ao atualizar IA:', error)
        }
    }

    const handleUpdateField = async (field: string, value: any) => {
        if (!lead) return

        // Optimistic update
        setLead({ ...lead, [field]: value })

        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ [field]: value })
            .eq('id', leadId)

        if (error) {
            console.error(`Erro ao atualizar ${field}:`, error)
        }
    }

    if (!lead) return null

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.avatar}>
                    {lead.name ? lead.name[0].toUpperCase() : '#'}
                </div>
                <h3>{lead.name || 'Lead sem nome'}</h3>
                <p className={styles.phone}>{lead.phone}</p>
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Status</h4>
                <div className={styles.statusBadge}>
                    {lead.status.replace('_', ' ')}
                </div>
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Gestão</h4>

                <label className={styles.label}>Atendente Responsável</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Nome do atendente"
                    value={lead.atendente_responsavel || ''}
                    onChange={(e) => handleUpdateField('atendente_responsavel', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />

                {!lead.is_ai_active && (
                    <>
                        <label className={styles.label}>Retomada da IA em</label>
                        <input
                            type="datetime-local"
                            className={styles.input}
                            value={lead.ia_retomada_em ? new Date(lead.ia_retomada_em).toISOString().slice(0, 16) : ''}
                            onChange={(e) => handleUpdateField('ia_retomada_em', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        />
                    </>
                )}

                <label className={styles.label}>Notas Internas</label>
                <textarea
                    className={styles.input}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Adicione observações sobre o lead..."
                    value={lead.notas || ''}
                    onChange={(e) => handleUpdateField('notas', e.target.value)}
                />
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Configurações da IA</h4>
                <div className={styles.toggleRow}>
                    <span>IA Ativa</span>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={lead.is_ai_active}
                            onChange={handleToggleAI}
                        />
                        <span className={styles.slider}></span>
                    </label>
                </div>
            </div>
        </div>
    )
}
