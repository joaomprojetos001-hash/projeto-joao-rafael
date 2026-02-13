'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './CreateCampaignModal.module.css'

import { useCompany } from '@/context/CompanyContext'

interface Props {
    onClose: () => void
    onSuccess: () => void
}

export default function CreateCampaignModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<any[]>([])
    const [formData, setFormData] = useState({
        nome: '',
        mensagem: '',
        tempo_disparo: '',
        segmento: 'todos',
        product_id: '',
        whatsapp_instance_id: '',
        is_recurrent: false,
        recurrence_period: 3 // Default 3 dias
    })

    // Separate state for date and time to control UI
    const [datePart, setDatePart] = useState('')
    const [timePart, setTimePart] = useState('09:00')

    // Available WhatsApp instances
    const [instances, setInstances] = useState<any[]>([])

    const { selectedCompany } = useCompany()

    // Fetch Products filtered by company
    useEffect(() => {
        const fetchProducts = async () => {
            const supabase = createClient()
            let query = supabase.from('produtos').select('id, nome').eq('is_active', true)

            // Filter by company_tag
            if (selectedCompany !== 'ALL') {
                query = query.eq('company_tag', selectedCompany)
            }

            const { data } = await query
            if (data) setProducts(data)
        }
        fetchProducts()
    }, [selectedCompany])

    // Fetch WhatsApp Instances
    useEffect(() => {
        const fetchInstances = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('whatsapp_instances').select('id, instance_name, is_connected').order('id')
            if (data) setInstances(data)
        }
        fetchInstances()
    }, [])

    // Filter instances based on selected company
    const getFilteredInstances = () => {
        if (!instances.length) return []

        // Linha 1 = PSC+TS (ID 1)
        // Linha 2 = PSC Consórcios (ID 2)
        // Linha 3 = Extra (ID 3)

        switch (selectedCompany) {
            case 'PSC_TS':
                return instances.filter(i => i.id === 1 || i.id === 3)
            case 'PSC_CONSORCIOS':
                return instances.filter(i => i.id === 2 || i.id === 3)
            default:
                return instances // Show all if ALL or unselected
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        // Trigger Webhook
        try {
            // Payload Webhook Atualizado
            const payload = {
                ...formData,
                company_tag: selectedCompany === 'ALL' ? 'PSC_TS' : selectedCompany, // Default to PSC_TS if ALL
                product_status: formData.product_id ? 'product-true' : 'product-false',
                product_id: formData.product_id || null
            }

            await fetch("https://api.fabianoportto.shop/webhook/c13d0896-f1b2-4386-a190-e3ce96657871", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            })
        } catch (error) {
            console.error('Erro ao acionar webhook de campanha:', error)
        }

        // Determine company tag to use
        const companyTag = selectedCompany === 'ALL' ? 'PSC_TS' : selectedCompany
        console.log('[CreateCampaignModal] Creating campaign with company_tag:', companyTag, '| selectedCompany from context:', selectedCompany)

        const { error } = await supabase
            .from('campanhas')
            .insert({
                ...formData,
                company_tag: companyTag,
                product_id: formData.product_id || null
            })

        if (!error) {
            onSuccess()
        } else {
            alert(`Erro ao criar campanha: ${error.message || JSON.stringify(error)}`)
            console.error(error)
            setLoading(false)
        }
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Nova Campanha</h2>
                    <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label>Nome da Campanha</label>
                        <input
                            type="text"
                            required
                            className="input"
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Ex: Recuperação de Lead 24h"
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Mensagem</label>
                        <textarea
                            required
                            className="input"
                            rows={4}
                            value={formData.mensagem}
                            onChange={e => setFormData({ ...formData, mensagem: e.target.value })}
                            placeholder="Olá! Ainda tem interesse no consórcio?"
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field} style={{ flex: 2 }}>
                            <label>Data do Disparo</label>
                            <input
                                type="date"
                                className="input"
                                value={datePart}
                                onChange={e => {
                                    setDatePart(e.target.value)
                                    if (e.target.value && timePart) {
                                        setFormData({ ...formData, tempo_disparo: `${e.target.value}T${timePart}` })
                                    }
                                }}
                                required
                            />
                        </div>

                        <div className={styles.field} style={{ flex: 1 }}>
                            <label>Horário</label>
                            <select
                                className="input"
                                value={timePart}
                                onChange={e => {
                                    setTimePart(e.target.value)
                                    if (datePart && e.target.value) {
                                        setFormData({ ...formData, tempo_disparo: `${datePart}T${e.target.value}` })
                                    }
                                }}
                                required
                            >
                                {Array.from({ length: 48 }).map((_, i) => {
                                    const hours = Math.floor(i / 2).toString().padStart(2, '0')
                                    const minutes = (i % 2 === 0 ? '00' : '30')
                                    const time = `${hours}:${minutes}`
                                    return <option key={time} value={time}>{time}</option>
                                })}
                            </select>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Segmento Alvo</label>
                        <select
                            className="input"
                            value={formData.segmento}
                            onChange={e => setFormData({ ...formData, segmento: e.target.value })}
                        >
                            <option value="todos">Todos</option>
                            <option value="em_atendimento">Em Atendimento</option>
                            <option value="nao_respondido">Não Respondido</option>
                            <option value="em_negociacao">Em Negociação</option>
                            <option value="fechado">Fechado</option>
                            <option value="venda_perdida">Venda Perdida</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Linha de Disparo</label>
                        <select
                            className="input"
                            value={formData.whatsapp_instance_id}
                            onChange={e => setFormData({ ...formData, whatsapp_instance_id: e.target.value })}
                            required
                        >
                            <option value="">-- Selecione uma Linha --</option>
                            {getFilteredInstances().map(inst => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.instance_name} {inst.id === 3 ? '(Extra)' : ''}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '4px' }}>
                            ⚠️ Certifique-se de que a linha selecionada esteja conectada antes de criar a campanha.
                        </p>
                    </div>

                    <div className={styles.field}>
                        <label>Produto de Interesse</label>
                        <select
                            className="input"
                            value={formData.product_id}
                            onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                        >
                            <option value="">-- Nenhum / Todos --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.checkboxRow}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={formData.is_recurrent}
                                onChange={e => setFormData({ ...formData, is_recurrent: e.target.checked })}
                            />
                            Modo Recorrente?
                        </label>
                    </div>

                    {formData.is_recurrent && (
                        <div className={styles.field}>
                            <label>Repetir a cada (dias):</label>
                            <input
                                type="number"
                                min="1"
                                className="input"
                                value={formData.recurrence_period}
                                onChange={e => setFormData({ ...formData, recurrence_period: parseInt(e.target.value) })}
                            />
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className="btn" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Criando...' : 'Criar Campanha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
