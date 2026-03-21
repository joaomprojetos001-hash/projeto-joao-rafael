'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './dashboard.module.css'
import { useCompany } from '@/context/CompanyContext'

type TimePeriod = 'today' | 'yesterday' | '7days' | '15days' | '1month' | 'custom'

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
    company_tag?: string
}

// Helper function to calculate date ranges
function getDateRange(period: TimePeriod, customStart?: string, customEnd?: string): { start: string; end: string } {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    switch (period) {
        case 'today':
            return {
                start: todayStart.toISOString(),
                end: todayEnd.toISOString()
            }
        case 'yesterday': {
            const yesterdayStart = new Date(todayStart)
            yesterdayStart.setDate(yesterdayStart.getDate() - 1)
            const yesterdayEnd = new Date(todayStart)
            yesterdayEnd.setMilliseconds(-1)
            return {
                start: yesterdayStart.toISOString(),
                end: yesterdayEnd.toISOString()
            }
        }
        case '7days': {
            const weekAgo = new Date(todayStart)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return {
                start: weekAgo.toISOString(),
                end: todayEnd.toISOString()
            }
        }
        case '15days': {
            const fifteenDaysAgo = new Date(todayStart)
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
            return {
                start: fifteenDaysAgo.toISOString(),
                end: todayEnd.toISOString()
            }
        }
        case '1month': {
            const monthAgo = new Date(todayStart)
            monthAgo.setDate(monthAgo.getDate() - 30)
            return {
                start: monthAgo.toISOString(),
                end: todayEnd.toISOString()
            }
        }
        case 'custom':
            if (customStart && customEnd) {
                return {
                    start: new Date(customStart).toISOString(),
                    end: new Date(customEnd + 'T23:59:59.999Z').toISOString()
                }
            }
            // Fallback to last 30 days if no custom range
            const fallbackStart = new Date(todayStart)
            fallbackStart.setDate(fallbackStart.getDate() - 30)
            return {
                start: fallbackStart.toISOString(),
                end: todayEnd.toISOString()
            }
        default:
            return {
                start: todayStart.toISOString(),
                end: todayEnd.toISOString()
            }
    }
}

// Icon SVGs
function IconLeads() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function IconActivity() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    )
}

function IconCheck() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
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
        fechado: 0,
        venda_perdida: 0
    })

    const { selectedCompany, setCompany } = useCompany()

    // Time period state
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today')
    const [customStartDate, setCustomStartDate] = useState<string>('')
    const [customEndDate, setCustomEndDate] = useState<string>('')

    useEffect(() => {
        const fetchData = async (isInitial = true) => {
            if (isInitial) setLoading(true)
            const supabase = createClient()

            // 1. Get User Profile & Role
            const { data: { user } } = await supabase.auth.getUser()

            let productIds: string[] | null = null
            let isAdmin = false

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    isAdmin = true
                } else {
                    const { data: products } = await supabase
                        .from('user_products')
                        .select('product_id')
                        .eq('user_id', user.id)

                    if (products) {
                        productIds = products.map(p => p.product_id)
                    }
                }
            }

            // Get date range based on selected period
            const dateRange = getDateRange(selectedPeriod, customStartDate, customEndDate)

            // Helper to apply filters (company + product + date)
            const applyFilter = (query: any, applyDateFilter = true) => {
                // Product Filter
                if (!isAdmin && productIds && productIds.length > 0) {
                    query = query.in('produto_interesse', productIds)
                } else if (!isAdmin && (!productIds || productIds.length === 0)) {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000')
                }

                // Company Filter
                if (selectedCompany !== 'ALL') {
                    query = query.eq('company_tag', selectedCompany)
                }

                // Date Filter based on updated_at
                if (applyDateFilter) {
                    query = query.gte('updated_at', dateRange.start)
                    query = query.lte('updated_at', dateRange.end)
                }

                return query
            }

            // 1. Total Leads (filtered by period)
            let queryTotal = supabase.from('leads').select('*', { count: 'exact', head: true })
            queryTotal = applyFilter(queryTotal)
            const { count: totalLeads } = await queryTotal

            // 2. Leads created today (always today, not affected by period filter)
            const today = new Date().toISOString().split('T')[0]
            let queryToday = supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', today)
            queryToday = applyFilter(queryToday, false)
            const { count: leadsToday } = await queryToday

            // 3. Fechados (filtered by period)
            let queryClosed = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'fechado')
            queryClosed = applyFilter(queryClosed)
            const { count: closedTotal } = await queryClosed

            // 4. Leads Urgentes (all pending urgent, excluding already handled)
            let queryUrgents = supabase
                .from('leads')
                .select('*')
                .eq('is_urgent', true)
                .neq('status', 'em_atendimento')
                .neq('status', 'fechado')
                .neq('status', 'venda_perdida')
                .order('updated_at', { ascending: false })
            if (!isAdmin && productIds && productIds.length > 0) {
                queryUrgents = queryUrgents.in('produto_interesse', productIds)
            } else if (!isAdmin && (!productIds || productIds.length === 0)) {
                queryUrgents = queryUrgents.eq('id', '00000000-0000-0000-0000-000000000000')
            }
            const { data: urgents } = await queryUrgents

            // 5. Pipeline Stats (filtered by period)
            let queryPipeline = supabase.from('leads').select('status')
            queryPipeline = applyFilter(queryPipeline)
            const { data: allLeads } = await queryPipeline

            const stats = {
                atendimento: 0,
                nao_respondido: 0,
                negociacao: 0,
                fechado: 0,
                venda_perdida: 0
            }

            if (allLeads) {
                allLeads.forEach(l => {
                    if (l.status === 'em_atendimento') stats.atendimento++
                    if (l.status === 'nao_respondido') stats.nao_respondido++
                    if (l.status === 'em_negociacao') stats.negociacao++
                    if (l.status === 'fechado') stats.fechado++
                    if (l.status === 'venda_perdida') stats.venda_perdida++
                })
            }

            setMetrics({
                totalLeads: totalLeads || 0,
                leadsToday: leadsToday || 0,
                closedTotal: closedTotal || 0,
                closureRate: totalLeads ? `${Math.round(((closedTotal || 0) / totalLeads) * 100)}%` : '0%',
                avgResponseTime: '5 min'
            })

            if (urgents) setUrgentLeads(urgents)
            setPipelineStats(stats)
            if (isInitial) setLoading(false)
        }

        fetchData(true)

        // Realtime: silently refetch when leads or messages change
        const supabase = createClient()
        const leadsChannel = supabase
            .channel('dashboard-leads-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
                () => fetchData(false)
            )
            .subscribe()

        const messagesChannel = supabase
            .channel('dashboard-messages-rt')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                () => fetchData(false)
            )
            .subscribe()

        return () => {
            supabase.removeChannel(leadsChannel)
            supabase.removeChannel(messagesChannel)
        }
    }, [selectedCompany, selectedPeriod, customStartDate, customEndDate])

    const periodLabels: Record<TimePeriod, string> = {
        'today': 'Hoje',
        'yesterday': 'Ontem',
        '7days': '7 dias',
        '15days': '15 dias',
        '1month': '1 mês',
        'custom': 'Custom'
    }

    // Compact labels for mobile pills
    const periodLabelsMobile: Record<TimePeriod, string> = {
        'today': 'Hoje',
        'yesterday': 'Ontem',
        '7days': '7 Dias',
        '15days': '15 Dias',
        '1month': '30 Dias',
        'custom': 'Custom'
    }

    // Carousel state for urgent leads
    const [carouselPage, setCarouselPage] = useState(0)
    const carouselRef = useRef<HTMLDivElement>(null)
    const CARDS_PER_PAGE = 3
    const totalPages = Math.ceil(urgentLeads.length / CARDS_PER_PAGE)

    const goToPage = useCallback((page: number) => {
        const clamped = Math.max(0, Math.min(page, totalPages - 1))
        setCarouselPage(clamped)
        if (carouselRef.current) {
            const cardWidth = carouselRef.current.scrollWidth / urgentLeads.length
            carouselRef.current.scrollTo({
                left: clamped * CARDS_PER_PAGE * cardWidth,
                behavior: 'smooth'
            })
        }
    }, [totalPages, urgentLeads.length])

    // Reset page when urgentLeads change
    useEffect(() => {
        if (carouselPage >= totalPages && totalPages > 0) {
            setCarouselPage(totalPages - 1)
        }
    }, [urgentLeads.length, totalPages, carouselPage])

    if (loading) return <div className={styles.loading}>Carregando dashboard...</div>

    return (
        <div className={styles.dashboard}>
            {/* Header: Title + Company Filter */}
            <header className={styles.header}>
                <div>
                    <h1>Dashboard</h1>
                    <p className="text-sm text-muted">Visão geral em tempo real</p>
                </div>
                <div className={styles.companyFilterContainer}>
                    <button
                        className={`${styles.companyBtn} ${selectedCompany === 'PSC_TS' ? styles.companyBtnActivePsc : ''}`}
                        onClick={() => setCompany('PSC_TS')}
                    >
                        PSC+TS
                    </button>
                    <button
                        className={`${styles.companyBtn} ${selectedCompany === 'PSC_CONSORCIOS' ? styles.companyBtnActiveConsorcios : ''}`}
                        onClick={() => setCompany('PSC_CONSORCIOS')}
                    >
                        Consórcios
                    </button>
                    <button
                        className={`${styles.companyBtn} ${selectedCompany === 'ALL' ? styles.companyBtnActiveAll : ''}`}
                        onClick={() => setCompany('ALL')}
                    >
                        Todos
                    </button>
                </div>
            </header>

            {/* Time Period Filter (Desktop only - hidden on mobile) */}
            <section className={styles.timeFilterSection}>
                <div className={styles.timeFilterContainer}>
                    {(['today', 'yesterday', '7days', '15days', '1month', 'custom'] as TimePeriod[]).map((period) => (
                        <button
                            key={period}
                            className={`${styles.timeFilterButton} ${selectedPeriod === period ? styles.timeFilterActive : ''}`}
                            onClick={() => setSelectedPeriod(period)}
                        >
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>

                {selectedPeriod === 'custom' && (
                    <div className={styles.customDatePicker}>
                        <div className={styles.dateInputGroup}>
                            <label>De:</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                        <div className={styles.dateInputGroup}>
                            <label>Até:</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Área de Leads Urgentes */}
            <section className={styles.urgentSection}>
                <div className={styles.sectionHeader}>
                    <h2>⚠️ Leads Urgentes</h2>
                    {urgentLeads.length > 0 && (
                        <span className="badge badge-warning">{urgentLeads.length} ativos</span>
                    )}
                </div>

                {urgentLeads.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>🎉 Nenhum lead urgente pendente!</p>
                    </div>
                ) : (
                    <div className={styles.urgentCarouselWrapper}>
                        {/* Left Arrow */}
                        {totalPages > 1 && (
                            <button
                                className={`${styles.urgentNavBtn} ${styles.urgentNavBtnLeft}`}
                                onClick={() => goToPage(carouselPage - 1)}
                                disabled={carouselPage === 0}
                                aria-label="Anterior"
                            >
                                ‹
                            </button>
                        )}

                        {/* Cards Container */}
                        <div className={styles.urgentList} ref={carouselRef}>
                            {urgentLeads.map(lead => (
                                <div key={lead.id} className={`card ${styles.urgentCard}`}>
                                    <div className={styles.urgentHeader}>
                                        <div>
                                            <h3>{lead.name || lead.phone}</h3>
                                            <p className="text-sm text-secondary">{lead.phone}</p>
                                        </div>
                                        <span className="badge badge-warning">Urgente</span>
                                    </div>
                                    <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-sm)' }}>
                                        Status: <span style={{ textTransform: 'capitalize' }}>{lead.status.replace('_', ' ')}</span>
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        style={{ marginTop: 'var(--spacing-md)', width: '100%', background: '#FF8A80', borderColor: '#FF8A80' }}
                                        onClick={async () => {
                                            const supabase = createClient()
                                            await supabase
                                                .from('leads')
                                                .update({ status: 'em_atendimento' })
                                                .eq('id', lead.id)
                                            router.push(`/kanban?leadId=${lead.id}`)
                                        }}
                                    >
                                        Atender Agora
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Right Arrow */}
                        {totalPages > 1 && (
                            <button
                                className={`${styles.urgentNavBtn} ${styles.urgentNavBtnRight}`}
                                onClick={() => goToPage(carouselPage + 1)}
                                disabled={carouselPage === totalPages - 1}
                                aria-label="Próximo"
                            >
                                ›
                            </button>
                        )}
                    </div>
                )}

                {/* Page indicator */}
                {totalPages > 1 && (
                    <div className={styles.urgentPageIndicator}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                className={`${styles.urgentDot} ${i === carouselPage ? styles.urgentDotActive : ''}`}
                                onClick={() => goToPage(i)}
                                aria-label={`Página ${i + 1}`}
                            />
                        ))}
                        <span className={styles.urgentPageText}>
                            {carouselPage * CARDS_PER_PAGE + 1}–{Math.min((carouselPage + 1) * CARDS_PER_PAGE, urgentLeads.length)} de {urgentLeads.length}
                        </span>
                    </div>
                )}
            </section>

            {/* Painel de Métricas */}
            <section className={styles.metricsSection}>
                <div className={styles.sectionHeader}>
                    <h2>📊 Métricas</h2>
                    {/* Mobile pills filter - only visible on mobile */}
                    <div className={styles.mobileTimeFilter}>
                        {(['today', '7days', '1month', 'custom'] as TimePeriod[]).map((period) => (
                            <button
                                key={period}
                                className={`${styles.mobileTimeBtn} ${selectedPeriod === period ? styles.mobileTimeBtnActive : ''}`}
                                onClick={() => setSelectedPeriod(period)}
                            >
                                {periodLabelsMobile[period]}
                            </button>
                        ))}
                    </div>
                    {/* Desktop label */}
                    <span className={`text-sm text-muted ${styles.desktopOnly}`}>{periodLabels[selectedPeriod]}</span>
                </div>

                <div className={styles.metricsGrid}>
                    {/* Total Leads */}
                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Total de Leads</p>
                            <h3 className={styles.metricValue}>{metrics.totalLeads}</h3>
                            <p className="text-xs text-muted">+{metrics.leadsToday} hoje</p>
                        </div>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-gold)' }}>
                            <IconLeads />
                        </div>
                    </div>

                    {/* Taxa Conclusão */}
                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Taxa Conclusão</p>
                            <h3 className={styles.metricValue}>{metrics.closureRate}</h3>
                            <p className="text-xs" style={{ color: 'var(--color-success)' }}>{periodLabels[selectedPeriod]}</p>
                        </div>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-gold)' }}>
                            <IconActivity />
                        </div>
                    </div>

                    {/* Fechados */}
                    <div className={`card ${styles.metricCard}`}>
                        <div className={styles.metricContent}>
                            <p className="text-sm text-secondary">Fechados</p>
                            <h3 className={styles.metricValue}>{metrics.closedTotal}</h3>
                            <p className="text-xs" style={{ color: 'var(--color-success)' }}>{periodLabels[selectedPeriod]}</p>
                        </div>
                        <div className={styles.metricIcon} style={{ background: 'var(--gradient-blue)' }}>
                            <IconCheck />
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
                    <PipelineCard
                        label="Em Atendimento"
                        count={pipelineStats.atendimento}
                        badgeClass="badge badge-primary"
                        badgeLabel="Ativo"
                        accentColor="#4A90E2"
                    />
                    <PipelineCard
                        label="Não Respondidos"
                        count={pipelineStats.nao_respondido}
                        badgeClass="badge badge-warning"
                        badgeLabel="Atenção"
                        accentColor="#F6AD55"
                    />
                    <PipelineCard
                        label="Em Negociação"
                        count={pipelineStats.negociacao}
                        badgeClass="badge badge-info"
                        badgeLabel="Progresso"
                        accentColor="#9F7AEA"
                    />
                    <PipelineCard
                        label="Fechados"
                        count={pipelineStats.fechado}
                        badgeClass="badge badge-success"
                        badgeLabel="Sucesso"
                        accentColor="#48BB78"
                    />
                    <PipelineCard
                        label="Venda Perdida"
                        count={pipelineStats.venda_perdida}
                        badgeClass="badge"
                        badgeLabel="Perdido"
                        accentColor="#71717a"
                    />
                </div>
            </section>

        </div>
    )
}

function PipelineCard({
    label,
    count,
    badgeClass,
    badgeLabel,
    accentColor
}: {
    label: string
    count: number
    badgeClass: string
    badgeLabel: string
    accentColor: string
}) {
    return (
        <div
            className={`card ${styles.pipelineCard}`}
            style={{ borderBottomColor: accentColor }}
        >
            <div className={styles.pipelineCardContent}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</h4>
                <p className={styles.pipelineCount}>{count}</p>
                <span className={badgeClass} style={badgeLabel === 'Perdido' ? { background: '#71717a20', color: '#71717a' } : undefined}>
                    {badgeLabel}
                </span>
            </div>
        </div>
    )
}
