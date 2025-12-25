'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './whatsapp.module.css'

interface WhatsAppInstance {
    id: number
    instance_name: string
    is_connected: boolean
}

function WhatsAppConnectionCard({
    id,
    instanceName,
    initialStatus,
    onStatusChange
}: {
    id: number
    instanceName: string
    initialStatus: boolean
    onStatusChange: (id: number, status: boolean) => void
}) {
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const status = initialStatus ? 'connected' : 'disconnected'
    const WEBHOOK_URL_QR = 'https://api.fabianoportto.shop/webhook/83bef3b8-e3c6-404d-b608-6701d9ecdaca'

    const handleGenerateQR = async () => {
        setLoading(true)
        setQrCode(null)

        try {
            const response = await fetch(WEBHOOK_URL_QR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'qr_code',
                    instance_name: instanceName // Sending the instance name to the webhook
                })
            })

            if (!response.ok) throw new Error('Falha ao conectar com o serviço')

            const data = await response.text()
            const cleanData = data.replace(/"/g, '')
            setQrCode(cleanData)

        } catch (error) {
            console.error(`Erro ao gerar QR Code para ${instanceName}:`, error)
            alert('Erro ao gerar QR Code. Verifique o console.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.card}>
            <h3>{instanceName}</h3>
            <div className={`${styles.statusIndicator} ${status === 'connected' ? styles.connected : styles.disconnected}`}>
                <span className={styles.pulse}></span>
                {status === 'connected' ? 'Conectado' : 'Desconectado'}
            </div>

            <div className={styles.qrContainer}>
                {qrCode ? (
                    <img src={qrCode} alt={`QR Code ${instanceName}`} className={styles.qrImage} />
                ) : (
                    <div className={styles.placeholder}>
                        {loading ? 'Gerando...' : 'Clique em "Novo QR Code"'}
                        {status === 'connected' && !loading && <div>(Já conectado)</div>}
                    </div>
                )}
            </div>

            <div className={styles.actions}>
                <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleGenerateQR}
                    disabled={loading}
                >
                    {loading ? 'Aguarde...' : (status === 'connected' ? 'Reconectar' : 'Novo QR Code')}
                </button>
            </div>
        </div>
    )
}

export default function WhatsAppPage() {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([])
    const supabase = createClient()

    useEffect(() => {
        fetchInstances()

        const channel = supabase
            .channel('whatsapp-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'whatsapp_instances'
                },
                (payload) => {
                    setInstances((current) =>
                        current.map((inst) =>
                            inst.id === payload.new.id
                                ? { ...inst, is_connected: payload.new.is_connected }
                                : inst
                        )
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchInstances = async () => {
        const { data, error } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .order('id', { ascending: true })

        if (error) {
            console.error('Erro ao buscar instâncias:', error)
        } else {
            // Ensure we have 3 instances if not already in DB (fallback/initial state handled by SQL seed, but good to be safe)
            setInstances(data || [])
        }
    }

    // Initialize with 3 placeholders if fetch fails or is empty initially (should match SQL seed)
    const displayInstances = instances.length > 0 ? instances : [
        { id: 1, instance_name: 'Linha 1', is_connected: false },
        { id: 2, instance_name: 'Linha 2', is_connected: false },
        { id: 3, instance_name: 'Linha 3', is_connected: false },
    ]

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Conexão WhatsApp</h1>
                <p>3 Linhas de whatsapp, apenas 1 sistema central</p>
                <p className={styles.subtitle}>Gerencie as conexões das suas instâncias com os QR codes</p>
            </header>

            <div className={styles.content}>
                {displayInstances.map((instance) => (
                    <WhatsAppConnectionCard
                        key={instance.id}
                        id={instance.id}
                        instanceName={instance.instance_name}
                        initialStatus={instance.is_connected}
                        onStatusChange={(id, status) => {
                            // Optimistic update if needed, but we rely on realtime/re-fetch or parent state
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
