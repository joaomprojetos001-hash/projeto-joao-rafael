'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'
import UserDetailModal from './UserDetailModal'

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
        if (!confirm('Tem certeza que deseja remover este usuário?')) return

        const supabase = createClient()
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (!error) {
            setUsers(users.filter(u => u.id !== userId))
        } else {
            alert('Erro ao remover usuário')
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

            <h2 className={styles.subtitle}>Gerenciamento de Usuários</h2>

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
                                <td>
                                    <strong>{user.name}</strong>
                                </td>
                                <td>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                        {user.phone}<br />
                                        ID: {user.id.slice(0, 8)}...
                                    </div>
                                </td>
                                <td>
                                    {user.is_approved ? (
                                        <span className={styles.badgeSuccess}>Aprovado</span>
                                    ) : (
                                        <span className={styles.badgeWarning}>Pendente</span>
                                    )}
                                </td>
                                <td>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {user.role === 'admin' ? 'ADMIN' : 'Agente'}
                                    </span>
                                </td>
                                <td>
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
