'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './LeadInfo.module.css'

interface LeadInfoProps {
    leadId: string
    onClose?: () => void
}

interface Product {
    id: string
    nome: string
}

export default function LeadInfo({ leadId, onClose }: LeadInfoProps) {
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

    // Robust product matching: handles clean UUIDs, concatenated "Name- UUID", and name-only values
    const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    let currentProduct: Product | undefined = undefined

    if (lead.produto_interesse) {
        // 1. Direct UUID match
        currentProduct = products.find(p => p.id === lead.produto_interesse)

        // 2. Extract UUID from concatenated string
        if (!currentProduct) {
            const uuidMatch = lead.produto_interesse.match(UUID_REGEX)
            if (uuidMatch) {
                currentProduct = products.find(p => p.id === uuidMatch[0])
            }
        }

        // 3. Match by name
        if (!currentProduct) {
            currentProduct = products.find(p =>
                p.nome.toLowerCase() === lead.produto_interesse.toLowerCase()
            )
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {onClose && (
                    <button onClick={onClose} className={styles.closeButton} title="Fechar">
                        ✕
                    </button>
                )}
                <div className={styles.avatar}>
                    {lead.name ? lead.name[0].toUpperCase() : '#'}
                </div>
                <h3>{lead.name || 'Lead sem nome'}</h3>
                <p className={styles.phone}>{lead.phone}</p>
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Status / Pipeline</h4>
                <div className={styles.statusGrid}>
                    {[
                        { id: 'em_atendimento', label: 'Em Atendimento', color: '#6366f1' },
                        { id: 'em_negociacao', label: 'Em Negociação', color: '#f59e0b' },
                        { id: 'nao_respondido', label: 'Não Respondido', color: '#ef4444' },
                        { id: 'fechado', label: 'Fechado', color: '#10b981' },
                        { id: 'venda_perdida', label: 'Venda Perdida', color: '#71717a' },
                    ].map(s => (
                        <button
                            key={s.id}
                            className={`${styles.statusOption} ${lead.status === s.id ? styles.statusActive : ''}`}
                            style={{
                                borderColor: lead.status === s.id ? s.color : undefined,
                                background: lead.status === s.id ? `${s.color}20` : undefined,
                            }}
                            onClick={() => handleUpdateField('status', s.id)}
                        >
                            <span
                                className={styles.statusDot}
                                style={{ background: s.color }}
                            />
                            {s.label}
                        </button>
                    ))}
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
