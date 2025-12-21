'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './LeadInfo.module.css'

interface LeadInfoProps {
    leadId: string
}

interface Product {
    id: string
    nome: string
}

export default function LeadInfo({ leadId }: LeadInfoProps) {
    const [lead, setLead] = useState<any>(null)
    const [products, setProducts] = useState<Product[]>([])

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

        const fetchProducts = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('produtos')
                .select('id, nome')
                .order('nome', { ascending: true })

            if (data) setProducts(data)
        }

        fetchLead()
        fetchProducts()
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

    const currentProduct = products.find(p => p.id === lead.produto_interesse)

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

                <label className={styles.label}>Produto de Interesse</label>
                {currentProduct ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{
                            background: '#e0e7ff', color: '#3730a3', padding: '4px 8px',
                            borderRadius: '4px', fontSize: '14px', fontWeight: 500
                        }}>
                            {currentProduct.nome}
                        </span>
                        <button
                            onClick={() => handleUpdateField('produto_interesse', null)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}
                            title="Remover produto"
                        >
                            ❌
                        </button>
                    </div>
                ) : (
                    <select
                        className={styles.input}
                        value=""
                        onChange={(e) => handleUpdateField('produto_interesse', e.target.value)}
                        style={{ marginBottom: '16px' }}
                    >
                        <option value="" disabled>Selecione um produto...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.nome}
                            </option>
                        ))}
                    </select>
                )}

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
