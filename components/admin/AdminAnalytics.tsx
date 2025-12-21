'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'

export default function AdminAnalytics() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        closedLeads: 0,
        closureRate: '0%',
        leadsByProduct: [] as { name: string, count: number }[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const supabase = createClient()

            // 1. Total & Closed
            const { data: leads } = await supabase
                .from('leads')
                .select('status, produto_interesse')

            if (leads) {
                const total = leads.length
                const closed = leads.filter(l => l.status === 'fechado').length

                // Group by Product
                // First fetch product names
                const { data: products } = await supabase.from('produtos').select('id, nome')
                const productMap = new Map(products?.map(p => [p.id, p.nome]) || [])

                const productCounts: Record<string, number> = {}
                leads.forEach(l => {
                    const pName = productMap.get(l.produto_interesse) || 'Outros'
                    productCounts[pName] = (productCounts[pName] || 0) + 1
                })

                const sortedProducts = Object.entries(productCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)

                setStats({
                    totalLeads: total,
                    closedLeads: closed,
                    closureRate: total ? `${Math.round((closed / total) * 100)}%` : '0%',
                    leadsByProduct: sortedProducts
                })
            }
            setLoading(false)
        }
        fetchStats()
    }, [])

    if (loading) return <div className={styles.loading}>Carregando analytics...</div>

    return (
        <div className={styles.statCard}>
            <h2>📊 Relatórios de Performance</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>{stats.totalLeads}</h3>
                    <p className="text-sm">Total Leads</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                    <h3>{stats.closedLeads}</h3>
                    <p className="text-sm">Fechados</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--color-success)' }}>{stats.closureRate}</h3>
                    <p className="text-sm">Conversão</p>
                </div>
            </div>

            <h3>Leads por Produto</h3>
            <div style={{ marginTop: '1rem' }}>
                {stats.leadsByProduct.map(p => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ width: '150px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{p.name}</div>
                        <div style={{ flex: 1, background: 'var(--color-bg-secondary)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${(p.count / stats.totalLeads) * 100}%`,
                                background: 'var(--color-gold-primary)',
                                height: '100%'
                            }} />
                        </div>
                        <div style={{ width: '50px', textAlign: 'right', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{p.count}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
