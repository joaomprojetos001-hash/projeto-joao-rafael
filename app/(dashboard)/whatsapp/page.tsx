'use client'

import { useState } from 'react'
import styles from './whatsapp.module.css'

export default function WhatsAppPage() {
    const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // TODO: Configurar URL do Webhook N8N aqui
    const WEBHOOK_URL_QR = 'https://api.fabianoportto.shop/webhook/83bef3b8-e3c6-404d-b608-6701d9ecdaca'
    const WEBHOOK_URL_RESTART = 'https://api.fabianoportto.shop/webhook/83bef3b8-e3c6-404d-b608-6701d9ecdaca'

    const handleGenerateQR = async () => {
        setLoading(true)
        setQrCode(null)

        try {
            const response = await fetch(WEBHOOK_URL_QR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'qr_code' })
            })

            if (!response.ok) throw new Error('Falha ao conectar com N8N')

            // Assume que o N8N retorna o base64 direto no corpo como texto
            const data = await response.text()

            // Remove aspas extras se vierem no retorno
            const cleanData = data.replace(/"/g, '')
            setQrCode(cleanData)

        } catch (error) {
            console.error('Erro ao gerar QR Code:', error)
            alert('Erro ao gerar QR Code. Verifique o console.')
        } finally {
            setLoading(false)
        }
    }

    // const handleRestart removed

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Conexão WhatsApp</h1>
                <p>Gerencie a conexão da sua instância com o N8N</p>
            </header>

            <div className={styles.content}>
                <div className={styles.card}>
                    <div className={`${styles.statusIndicator} ${status === 'connected' ? styles.connected : styles.disconnected}`}>
                        <span className={styles.pulse}></span>
                        {status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </div>

                    <div className={styles.qrContainer}>
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code WhatsApp" className={styles.qrImage} />
                        ) : (
                            <div className={styles.placeholder}>
                                {loading ? 'Gerando...' : 'Clique em "Novo QR Code"'}
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={handleGenerateQR}
                            disabled={loading}
                        >
                            {loading ? 'Aguarde...' : 'Novo QR Code'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
