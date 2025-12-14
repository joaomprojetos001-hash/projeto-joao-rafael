'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './dashboard.module.css'

interface DashboardMetrics {
    totalLeads: number
    leadsToday: number
    closedTotal: number
    closureRate: string
    avgResponseTime: string
}

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_urgent: boolean
    created_at: string
}

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalLeads: 0,
        leadsToday: 0,
        closedTotal: 0,
        closureRate: '0%',
        avgResponseTime: '-'
    })
    const [urgentLeads, setUrgentLeads] = useState<Lead[]>([])
    const [pipelineStats, setPipelineStats] = useState({
        atendimento: 0,
        nao_respondido: 0,
        negociacao: 0,
        fechado: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const today = new Date().toISOString().split('T')[0]

            // 1. Total Leads
            const { count: totalLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })

            // 2. Leads Hoje
            const { count: leadsToday } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today)

            // 3. Fechados
            const { count: closedTotal } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'fechado')

            // 4. Leads Urgentes (Top 3)
            const { data: urgents } = await supabase
                .from('leads')
                .select('*')
                .eq('is_urgent', true)
                .order('updated_at', { ascending: false })
                .limit(3)

            // 5. Pipeline Stats
            const { data: allLeads } = await supabase
                .from('leads')
                .select('status')

            const stats = {
                atendimento: 0,
                nao_respondido: 0,
                negociacao: 0,
                fechado: 0
            }

            if (allLeads) {
                allLeads.forEach(l => {
                    if (l.status === 'em_atendimento') stats.atendimento++
                    if (l.status === 'nao_respondido') stats.nao_respondido++
                    if (l.status === 'em_negociacao') stats.negociacao++
                    if (l.status === 'fechado') stats.fechado++
                })
            }

            setMetrics({
                totalLeads: totalLeads || 0,
                leadsToday: leadsToday || 0,
                closedTotal: closedTotal || 0,
                closureRate: totalLeads ? `${Math.round(((closedTotal || 0) / totalLeads) * 100)}%` : '0%',
                avgResponseTime: '5 min' // Placeholder por enquanto
            })

            if (urgents) setUrgentLeads(urgents)
            setPipelineStats(stats)
            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) return <div className={styles.loading}>Carregando dashboard...</div>

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div>
                    <h1>Dashboard</h1>
                    <p className="text-secondary">Visão geral em tempo real</p>
                </div>
            </header>

            {/* Área de Leads Urgentes */}
            <section className={styles.urgentSection}>
                <div className={styles.sectionHeader}>
                    <h2>⚠️ Leads Urgentes</h2>
                    {urgentLeads.length > 0 && (
                        <span className="badge badge-warning">{urgentLeads.length} ativos</span>
                    )}
                </div>

                <div className={styles.urgentList}>
                    {urgentLeads.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>🎉 Nenhum lead urgente pendente!</p>
                        </div>
                    ) : (
                        urgentLeads.map(lead => (
                            <div key={lead.id} className={`card ${styles.urgentCard}`}>
                                <div className={styles.urgentHeader}>
                                    <div>
                                        <h3>{lead.name || lead.phone}</h3>
                                        <p className="text-sm text-secondary">{lead.phone}</p>
                                    </div>
                                    <span className="badge badge-warning">Urgente</span>
                                </div>
                                <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-sm)' }}>
                                    Status Atual: <span style={{ textTransform: 'capitalize' }}>{lead.status.replace('_', ' ')}</span>
                                </p>
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
                                    onClick={() => router.push(`/kanban?leadId=${lead.id}`)}
                                >
                                    Atender Agora
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Painel de Métricas */}
            <section className={styles.metricsSection}>
                <div className={styles.sectionHeader}>
                    <h2>📊 Métricas</h2>
                    <span className="text-sm text-muted">Hoje</span>
                </div>
                <div className={styles.metricsGrid}>
                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-primary)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Total de Leads</p>
                            <h3 className={styles.metricValue}>{metrics.totalLeads}</h3>
                            <p className="text-xs text-muted">+{metrics.leadsToday} hoje</p>
                        </div>
                    </div>

                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-success)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        </div>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Taxa Conclusão</p>
                            <h3 className={styles.metricValue}>{metrics.closureRate}</h3>
                            <p className="text-xs" style={{ color: 'var(--color-success)' }}>Global</p>
                        </div>
                    </div>

                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-secondary)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </div>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Fechados</p>
                            <h3 className={styles.metricValue}>{metrics.closedTotal}</h3>
                            <p className="text-xs" style={{ color: 'var(--color-success)' }}>Total</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visão Rápida do Pipeline */}
            <section className={styles.pipelineSection}>
                <div className={styles.sectionHeader}>
                    <h2>🔄 Pipeline Rápido</h2>
                    <button onClick={() => router.push('/pipeline')} className="btn btn-ghost">Ver Detalhes →</button>
                </div>
                <div className={styles.pipelineGrid}>
                    <div className={`card ${styles.pipelineCard}`}>
                        <h4>Em Atendimento</h4>
                        <p className={styles.pipelineCount}>{pipelineStats.atendimento}</p>
                        <span className="badge badge-primary">Ativo</span>
                    </div>
                    <div className={`card ${styles.pipelineCard}`}>
                        <h4>Não Respondidos</h4>
                        <p className={styles.pipelineCount}>{pipelineStats.nao_respondido}</p>
                        <span className="badge badge-warning">Atenção</span>
                    </div>
                    <div className={`card ${styles.pipelineCard}`}>
                        <h4>Em Negociação</h4>
                        <p className={styles.pipelineCount}>{pipelineStats.negociacao}</p>
                        <span className="badge badge-info">Progresso</span>
                    </div>
                    <div className={`card ${styles.pipelineCard}`}>
                        <h4>Fechados</h4>
                        <p className={styles.pipelineCount}>{pipelineStats.fechado}</p>
                        <span className="badge badge-success">Sucesso</span>
                    </div>
                </div>
            </section>
        </div>
    )
}
