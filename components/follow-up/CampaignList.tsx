'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './CampaignList.module.css'

interface Campaign {
    id: string
    nome: string
    mensagem: string
    tempo_disparo: string
    segmento: string
    is_active: boolean
    created_at: string
    is_recurrent?: boolean
    recurrence_period?: number
}

export default function CampaignList() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        const fetchCampaigns = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('campanhas')
                .select('*')
                .order('created_at', { ascending: false })

            if (data) setCampaigns(data)
            setLoading(false)
        }

        fetchCampaigns()
    }, [])

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setCampaigns(prev => prev.map(c =>
            c.id === id ? { ...c, is_active: !currentStatus } : c
        ))

        const supabase = createClient()
        await supabase
            .from('campanhas')
            .update({ is_active: !currentStatus })
            .eq('id', id)
    }

    const deleteCampaign = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return

        // Optimistic update
        setCampaigns(prev => prev.filter(c => c.id !== id))

        const supabase = createClient()
        await supabase
            .from('campanhas')
            .delete()
            .eq('id', id)
    }

    if (loading) return <div className={styles.loading}>Carregando campanhas...</div>

    if (campaigns.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>📢</div>
                <h3>Nenhuma campanha criada</h3>
                <p>Crie sua primeira campanha para engajar leads automaticamente.</p>
            </div>
        )
    }

    return (
        <div className={styles.grid}>
            {campaigns.map(campaign => (
                <div
                    key={campaign.id}
                    className={styles.card}
                    onClick={() => setSelectedId(selectedId === campaign.id ? null : campaign.id)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.statusRow}>
                            <span className={styles.badge}>{campaign.segmento}</span>
                            {selectedId === campaign.id && (
                                <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={campaign.is_active}
                                        onChange={() => toggleStatus(campaign.id, campaign.is_active)}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            )}
                        </div>
                        <h3>{campaign.nome}</h3>
                    </div>

                    <div className={styles.cardBody}>
                        <p className={styles.message}>"{campaign.mensagem}"</p>
                        <div className={styles.timing}>
                            <span style={{ color: '#4A90E2' }}>🕒 Dispara após:</span>
                            <span style={{ color: '#48BB78', fontWeight: '600' }}>
                                {new Date(campaign.tempo_disparo).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit'
                                })} às {new Date(campaign.tempo_disparo).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            {campaign.is_recurrent && (
                                <span style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} title={`Repete a cada ${campaign.recurrence_period} dias`}>
                                    🔄 {campaign.recurrence_period} dias
                                </span>
                            )}
                        </div>
                        {selectedId === campaign.id && (
                            <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    deleteCampaign(campaign.id)
                                }}
                                title="Excluir campanha"
                            >
                                🗑️ Excluir
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
