'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './whatsapp.module.css'

interface WhatsAppInstance {
    id: number
    instance_name: string
    is_connected: boolean
    company_tag?: string
    number?: string
}

interface WhatsAppConnectionCardProps {
    id: number
    instanceName: string
    initialStatus: boolean
    companyTag: string
    phoneNumber?: string
    isLocked: boolean // If true, cannot change company (Lines 1 & 2)
    onStatusChange: (id: number, status: boolean) => void
    onCompanyChange: (id: number, tag: string) => void
}

function WhatsAppConnectionCard({
    id,
    instanceName,
    initialStatus,
    companyTag,
    phoneNumber,
    isLocked,
    onStatusChange,
    onCompanyChange
}: WhatsAppConnectionCardProps) {
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
                    instance_name: instanceName,
                    company_tag: companyTag // Sending company tag to webhook
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

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#888' }}>
                    Empresa Associada:
                </label>
                {isLocked ? (
                    <div style={{
                        padding: '8px',
                        background: companyTag === 'PSC_TS' ? 'var(--color-gold)' : '#10b981',
                        color: '#1a1a1a',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        fontSize: '14px'
                    }}>
                        {companyTag === 'PSC_TS' ? 'PSC+TS' : 'PSC Consórcios'}
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 'normal', opacity: 0.7 }}>
                            (Fixa)
                        </span>
                    </div>
                ) : (
                    <select
                        value={companyTag}
                        onChange={(e) => onCompanyChange(id, e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)',
                            background: companyTag === 'PSC_TS' ? 'var(--color-gold)' : '#10b981',
                            color: companyTag === 'PSC_TS' ? 'black' : 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="PSC_TS" style={{ color: 'black' }}>PSC+TS</option>
                        <option value="PSC_CONSORCIOS" style={{ color: 'black' }}>PSC Consórcios</option>
                    </select>
                )}
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#888' }}>
                    Número conectado:
                </label>
                <div style={{
                    padding: '8px 12px',
                    background: 'rgba(218, 165, 32, 0.1)',
                    border: '1px solid rgba(218, 165, 32, 0.3)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: phoneNumber ? 'var(--color-gold-primary)' : 'var(--color-text-tertiary)',
                    letterSpacing: '0.05em'
                }}>
                    📱 {phoneNumber || 'Não disponível'}
                </div>
            </div>

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
                                ? { ...inst, is_connected: payload.new.is_connected, number: payload.new.number }
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

    const handleCompanyChange = async (id: number, tag: string) => {
        // Optimistic update
        setInstances(prev => prev.map(inst =>
            inst.id === id ? { ...inst, company_tag: tag } : inst
        ))

        const { error } = await supabase
            .from('whatsapp_instances')
            .update({ company_tag: tag })
            .eq('id', id)

        if (error) {
            console.error('Error updating company tag:', error)
            // Revert or fetch? Fetching is safer
            fetchInstances()
        }
    }

    // Initialize with 3 placeholders if fetch fails or is empty initially (should match SQL seed)
    const displayInstances = instances.length > 0 ? instances : [
        { id: 1, instance_name: 'Linha 1', is_connected: false, company_tag: 'PSC_TS' },
        { id: 2, instance_name: 'Linha 2', is_connected: false, company_tag: 'PSC_CONSORCIOS' },
        { id: 3, instance_name: 'Linha 3', is_connected: false, company_tag: 'PSC_TS' },
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
                        companyTag={instance.company_tag || 'PSC_TS'}
                        phoneNumber={instance.number}
                        isLocked={instance.id === 1 || instance.id === 2} // Lock lines 1 and 2
                        onStatusChange={(id, status) => {
                            // Optimistic update if needed, but we rely on realtime/re-fetch or parent state
                        }}
                        onCompanyChange={handleCompanyChange}
                    />
                ))}
            </div>
        </div>
    )
}
