'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './AdminDashboard.module.css'
import AdminTabs from '@/components/admin/AdminTabs'
import AdminApprovals from '@/components/admin/AdminApprovals'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import AdminAgents from '@/components/admin/AdminAgents'
import AdminLogs from '@/components/admin/AdminLogs'
import AdminSettings from '@/components/admin/AdminSettings'

export default function AdminPage() {
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('approvals')

    useEffect(() => {
        checkAdmin()
    }, [])

    const checkAdmin = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                setIsAdmin(true)
            }
        }
        setLoading(false)
    }

    if (loading) return <div className={styles.loading}>Verificando permissões...</div>

    if (!isAdmin) {
        return (
            <div className={styles.container}>
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}>
                    <h2 style={{ color: 'var(--color-error)' }}>⛔ Acesso Negado</h2>
                    <p>Esta área é restrita para administradores do sistema.</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Painel Administrativo</h1>
                    <p className="text-secondary">Gestão completa do sistema</p>
                </div>
            </div>

            <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className={styles.content}>
                {activeTab === 'approvals' && <AdminApprovals />}
                {activeTab === 'analytics' && <AdminAnalytics />}
                {activeTab === 'agents' && <AdminAgents />}
                {activeTab === 'logs' && <AdminLogs />}
                {activeTab === 'settings' && <AdminSettings />}
            </div>
        </div>
    )
}
