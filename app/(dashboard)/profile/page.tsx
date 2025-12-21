'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/providers/ThemeProvider'
import styles from './ProfilePage.module.css'
import { Moon, Sun } from 'lucide-react'

interface Product {
    id: string
    nome: string
    is_active: boolean
}

interface UserProfile {
    id: string
    name: string
    email: string
    phone: string
    role: string
    created_at: string
}

export default function ProfilePage() {
    const { theme, toggleTheme } = useTheme()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileData) {
                setProfile({
                    ...profileData,
                    email: user.email || ''
                })
            }

            // 2. Fetch Products
            const { data: userProductsData, error: productsError } = await supabase
                .from('user_products')
                .select(`
                    product_id,
                    produtos (
                        id,
                        nome,
                        is_active
                    )
                `)
                .eq('user_id', user.id)

            if (userProductsData) {
                // Map the nested object to flat product array
                // Using 'any' cast to safely handle join result structure
                const mappedProducts = userProductsData.map((item: any) => ({
                    id: item.produtos?.id,
                    nome: item.produtos?.nome,
                    is_active: item.produtos?.is_active
                })).filter(p => p.id) // Filter nulls

                setProducts(mappedProducts)
            }

            setLoading(false)
        }

        fetchData()
    }, [])

    if (loading) {
        return <div style={{ padding: '2rem' }}>Carregando perfil...</div>
    }

    if (!profile) {
        return <div style={{ padding: '2rem' }}>Erro ao carregar perfil.</div>
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Meu Perfil</h1>

            <div className={styles.profileGrid}>
                {/* Left Col: User Info */}
                <div className={styles.card}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className={styles.userName}>{profile.name}</h2>
                        <span className={styles.userRole}>
                            {profile.role === 'admin' ? 'Administrador' : 'Agente Autorizado'}
                        </span>

                        <div className={styles.divider} />

                        <div className={styles.infoRow}>
                            <span className={styles.label}>Email</span>
                            <span className={styles.value}>{profile.email}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Telefone</span>
                            <span className={styles.value}>{profile.phone || 'Não informado'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Membro desde</span>
                            <span className={styles.value}>
                                {new Date(profile.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Col: Products & Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Appearance Settings */}
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Aparência</h3>
                            <button
                                onClick={toggleTheme}
                                className="btn btn-secondary" // fallback if btn-secondary not in module
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-primary)'
                                }}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h3>Produtos Vinculados</h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            Você tem acesso aos leads destes produtos.
                        </p>

                        {products.length === 0 ? (
                            <p>Nenhum produto vinculado ainda. Contate o administrador.</p>
                        ) : (
                            <div className={styles.productsList}>
                                {products.map(product => (
                                    <div key={product.id} className={styles.productCard}>
                                        <span className={styles.productName}>{product.nome}</span>
                                        {product.is_active && (
                                            <span className={styles.productStatus}>Ativo</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
