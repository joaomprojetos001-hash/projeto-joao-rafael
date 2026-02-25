'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'
import UserDetailModal from './UserDetailModal'
import CreateUserModal from './CreateUserModal'

interface UserProfile {
    id: string
    name: string
    email: string
    phone: string
    role: string
    is_approved: boolean
    created_at: string
}

export default function AdminApprovals() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false } as any)

        if (data) setUsers(data as any)
        setLoading(false)
    }

    const handleApprove = async (userId: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', userId)

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: true } : u))
        } else {
            alert('Erro ao aprovar usuário')
        }
    }

    const deleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja remover este usuário por completo? Esta ação não pode ser desfeita.')) return

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setUsers(users.filter(u => u.id !== userId))
                alert('Usuário removido com sucesso!')
            } else {
                throw new Error(data.error || 'Erro ao remover usuário')
            }
        } catch (err: any) {
            console.error('Delete error:', err)
            alert(err.message || 'Erro ao remover usuário. Verifique se a chave de serviço está configurada.')
        }
    }

    const openDetails = (userId: string) => {
        setSelectedUser(userId)
        setIsModalOpen(true)
    }

    if (loading) return <div className={styles.loading}>Carregando usuários...</div>

    return (
        <div className={styles.container} style={{ padding: 0 }}>
            {selectedUser && (
                <UserDetailModal
                    userId={selectedUser}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={() => {
                        fetchUsers()
                        setIsModalOpen(false)
                    }}
                />
            )}

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Usuários</h3>
                    <p>{users.length}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Pendentes</h3>
                    <p>{users.filter(u => !u.is_approved).length}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Admins</h3>
                    <p>{users.filter(u => u.role === 'admin').length}</p>
                </div>
            </div>

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false)
                    fetchUsers()
                }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className={styles.subtitle} style={{ margin: 0 }}>Gerenciamento de Usuários</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ fontSize: '0.875rem', padding: '8px 16px' }}
                >
                    + Criar Usuário
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Info</th>
                            <th>Status</th>
                            <th>Função</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td data-label="Nome">
                                    <strong>{user.name}</strong>
                                </td>
                                <td data-label="Info">
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                        {user.phone}<br />
                                        ID: {user.id.slice(0, 8)}...
                                    </div>
                                </td>
                                <td data-label="Status">
                                    {user.is_approved ? (
                                        <span className={styles.badgeSuccess}>Aprovado</span>
                                    ) : (
                                        <span className={styles.badgeWarning}>Pendente</span>
                                    )}
                                </td>
                                <td data-label="Função">
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {user.role === 'admin' ? 'ADMIN' : 'Agente'}
                                    </span>
                                </td>
                                <td data-label="Ações">
                                    <div className={styles.actions}>
                                        {!user.is_approved && (
                                            <button
                                                className={styles.approveBtn}
                                                onClick={() => handleApprove(user.id)}
                                            >
                                                Aprovar
                                            </button>
                                        )}

                                        <button
                                            className={styles.roleBtn}
                                            onClick={() => openDetails(user.id)}
                                            title="Ver Detalhes e Editar"
                                            style={{
                                                background: 'var(--color-bg-secondary)',
                                                color: 'var(--color-text-primary)'
                                            }}
                                        >
                                            Detalhes
                                        </button>

                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => deleteUser(user.id)}
                                            title="Remover Usuário"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
