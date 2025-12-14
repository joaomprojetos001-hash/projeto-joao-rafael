'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './CreateCampaignModal.module.css'

interface Props {
    onClose: () => void
    onSuccess: () => void
}

export default function CreateCampaignModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nome: '',
        mensagem: '',
        tempo_disparo: '',
        segmento: 'nao_fechados',
        is_recurrent: false,
        recurrence_period: 3 // Default 3 dias
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const supabase = createClient()

        // Trigger Webhook
        try {
            await fetch("https://api.fabianoportto.shop/webhook/c13d0896-f1b2-4386-a190-e3ce96657871", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
        } catch (error) {
            console.error('Erro ao acionar webhook de campanha:', error)
        }

        const { error } = await supabase
            .from('campanhas')
            .insert(formData)

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
                        <div className={styles.field}>
                            <label>Dispara em:</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={formData.tempo_disparo}
                                onChange={e => setFormData({ ...formData, tempo_disparo: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Segmento Alvo</label>
                            <select
                                className="input"
                                value={formData.segmento}
                                onChange={e => setFormData({ ...formData, segmento: e.target.value })}
                            >
                                <option value="nao_fechados">Não Fechados</option>
                                <option value="fechados">Fechados</option>
                                <option value="todos">Todos</option>
                            </select>
                        </div>
                    </div>

                    {/* Recurrence option removed */}

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
