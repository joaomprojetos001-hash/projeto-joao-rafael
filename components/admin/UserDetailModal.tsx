'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Shield, User, Mail, Phone, Calendar, Package, AlertTriangle } from 'lucide-react'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserProfile {
    id: string
    name: string
    email: string
    phone: string
    role: string
    is_approved: boolean
    created_at: string
    stats?: {
        total: number
        closed: number
        rate: string
    }
}

interface Props {
    userId: string
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void // Callback to refresh parent list
}

export default function UserDetailModal({ userId, isOpen, onClose, onUpdate }: Props) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [products, setProducts] = useState<any[]>([])
    const [allProducts, setAllProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [editingProducts, setEditingProducts] = useState(false)

    useEffect(() => {
        if (isOpen && userId) {
            fetchDetails()
            fetchAllProducts()
        }
    }, [isOpen, userId])

    const fetchAllProducts = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('produtos').select('id, nome, company_tag').eq('is_active', true).order('nome')
        if (data) setAllProducts(data)
    }

    const toggleProduct = async (productId: string, isCurrentlyAssigned: boolean) => {
        setProcessing(true)
        const supabase = createClient()
        if (isCurrentlyAssigned) {
            await supabase.from('user_products').delete().eq('user_id', userId).eq('product_id', productId)
        } else {
            await supabase.from('user_products').insert({ user_id: userId, product_id: productId })
        }
        await fetchDetails()
        setProcessing(false)
    }

    const fetchDetails = async () => {
        setLoading(true)
        const supabase = createClient()

        // 1. Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        // 2. Fetch Products
        const { data: userProducts } = await supabase
            .from('user_products')
            .select('*')
            .eq('user_id', userId)

        // 3. Enrich products if needed (join with produtos table)
        // Since we don't have a direct join view easily available, let's fetch product names
        let enrichedProducts = []
        let stats = { total: 0, closed: 0, rate: '0%' }

        if (userProducts && userProducts.length > 0) {
            const productIds = userProducts.map(up => up.product_id)

            // Fetch Products Names
            const { data: productDetails } = await supabase
                .from('produtos')
                .select('id, nome')
                .in('id', productIds)

            if (productDetails) {
                const productMap = new Map(productDetails.map(p => [p.id, p.nome]))
                enrichedProducts = userProducts.map(up => ({
                    ...up,
                    product_name: productMap.get(up.product_id) || 'Produto Desconhecido'
                }))
            }

            // Fetch Stats for these products
            // Total
            const { count: total } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .in('produto_interesse', productIds)

            // Closed
            const { count: closed } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .in('produto_interesse', productIds)
                .eq('status', 'fechado')

            const totalVal = total || 0
            const closedVal = closed || 0
            stats = {
                total: totalVal,
                closed: closedVal,
                rate: totalVal ? `${Math.round((closedVal / totalVal) * 100)}%` : '0%'
            }
        }

        if (profile) setUser({ ...profile, stats } as any)
        if (enrichedProducts) setProducts(enrichedProducts)
        setLoading(false)
    }

    const handleRoleChange = async () => {
        if (!user) return
        const newRole = user.role === 'admin' ? 'agent' : 'admin'
        const actionName = newRole === 'admin' ? 'PROMOVER para ADMIN' : 'Rebaixar para Agente'

        if (!confirm(`Tem certeza que deseja ${actionName}?`)) return

        setProcessing(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id)

        if (!error) {
            setUser({ ...user, role: newRole })
            onUpdate() // Notify parent
            alert(`Usuário alterado para ${newRole.toUpperCase()} com sucesso.`)
        } else {
            alert('Erro ao alterar permissão.')
        }
        setProcessing(false)
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
            <div className={styles.statCard} style={{ width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden', position: 'relative' }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>Detalhes do Usuário</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
                ) : user ? (
                    <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>

                        {/* Status Banner */}
                        <div style={{
                            padding: '12px', borderRadius: '8px', marginBottom: '20px',
                            background: user.role === 'admin'
                                ? 'rgba(var(--color-primary-rgb), 0.1)'
                                : 'var(--color-bg-secondary)',
                            border: `1px solid ${user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            {user.role === 'admin' ? <Shield color="var(--color-primary)" /> : <User color="var(--color-text-secondary)" />}
                            <div>
                                <div style={{ fontWeight: 'bold', color: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                                    {user.role === 'admin' ? 'ADMINISTRADOR' : 'AGENTE'}
                                </div>
                                {/* ID hidden for cleaner UI */}
                            </div>
                        </div>

                        {/* Personal Metrics */}
                        {user.stats && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{user.stats.total}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Leads</div>
                                </div>
                                <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{user.stats.closed}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Fechados</div>
                                </div>
                                <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{user.stats.rate}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Conversão</div>
                                </div>
                            </div>
                        )}

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '4px' }}>Nome Completo</label>
                                <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{user.name || 'Não informado'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '4px' }}>Email</label>
                                <div style={{ color: 'var(--color-text-primary)' }}>{user.email || 'Não informado'}</div>
                                {/* Note: Email might not be in profile depending on implementation */}
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '4px' }}>Telefone</label>
                                <div style={{ color: 'var(--color-text-primary)' }}>{user.phone || 'Não informado'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '4px' }}>Data de Cadastro</label>
                                <div style={{ color: 'var(--color-text-primary)' }}>
                                    {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Products Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                            <h4 style={{ fontSize: '1rem', margin: 0 }}>Produtos Habilitados</h4>
                            <button
                                onClick={() => setEditingProducts(!editingProducts)}
                                className="btn"
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            >
                                {editingProducts ? 'Fechar' : 'Editar'}
                            </button>
                        </div>

                        {editingProducts ? (
                            <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
                                {/* PSC+TS Products */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-gold)', marginBottom: '8px', textTransform: 'uppercase' }}>PSC+TS</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                        {allProducts.filter(p => p.company_tag === 'PSC_TS').map(p => {
                                            const isAssigned = products.some(up => up.product_id === p.id)
                                            return (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.6 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isAssigned}
                                                        onChange={() => toggleProduct(p.id, isAssigned)}
                                                        disabled={processing}
                                                    />
                                                    <span style={{ fontSize: '0.85rem' }}>{p.nome}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                                {/* PSC Consórcios Products */}
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981', marginBottom: '8px', textTransform: 'uppercase' }}>PSC Consórcios</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                        {allProducts.filter(p => p.company_tag === 'PSC_CONSORCIOS').map(p => {
                                            const isAssigned = products.some(up => up.product_id === p.id)
                                            return (
                                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.6 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isAssigned}
                                                        onChange={() => toggleProduct(p.id, isAssigned)}
                                                        disabled={processing}
                                                    />
                                                    <span style={{ fontSize: '0.85rem' }}>{p.nome}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                                {products.length > 0 ? products.map((p, idx) => (
                                    <span key={idx} style={{
                                        padding: '6px 12px', borderRadius: '20px',
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.9rem'
                                    }}>
                                        {p.product_name}
                                    </span>
                                )) : (
                                    <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Nenhum produto vinculado. Clique em "Editar" para adicionar.</span>
                                )}
                            </div>
                        )}

                        {/* Danger Zone / Admin Actions */}
                        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações Administrativas</h4>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleRoleChange}
                                    disabled={processing}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: user.role === 'admin' ? 'var(--color-bg-secondary)' : 'var(--color-primary)',
                                        color: user.role === 'admin' ? 'var(--color-text-primary)' : 'white',
                                        border: user.role === 'admin' ? '1px solid var(--color-border)' : 'none',
                                        opacity: processing ? 0.7 : 1
                                    }}
                                >
                                    {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                </button>
                            </div>
                            {user.role === 'admin' && (
                                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertTriangle size={14} />
                                    Atenção: Admins têm acesso total ao sistema.
                                </p>
                            )}
                        </div>

                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-error)' }}>Usuário não encontrado.</div>
                )}
            </div>
        </div>
    )
}
