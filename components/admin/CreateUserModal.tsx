'use client'

import { useState } from 'react'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'agent'
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar usuário')
            }

            alert(`✅ ${data.message}`)
            setFormData({ name: '', email: '', phone: '', password: '', role: 'agent' })
            onSuccess()
        } catch (err: any) {
            setError(err.message || 'Erro ao criar usuário')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Criar Novo Usuário</h3>
                    <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#ef4444',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Nome *
                        </label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Email *
                        </label>
                        <input
                            type="email"
                            className="input"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="usuario@email.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Telefone
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="5500000000000"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Senha *
                        </label>
                        <input
                            type="password"
                            className="input"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                            Função
                        </label>
                        <select
                            className="input"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="agent">Agente</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} className="btn" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Criando...' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
