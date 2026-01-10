'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/login.module.css' // Reuse login styles

interface Product {
    id: string
    nome: string
    company_tag: string
}

export default function RegisterPage() {
    console.log("RegisterPage: Mounting component...")
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['PSC_TS']) // Default to PSC_TS
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        const fetchProducts = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('produtos')
                .select('id, nome, company_tag')
                .order('nome')

            if (data) setAvailableProducts(data)
        }
        fetchProducts()
    }, [])

    const handleProductToggle = (productId: string) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (selectedProducts.length === 0) {
                throw new Error('Selecione pelo menos um produto de responsabilidade.')
            }

            const supabase = createClient()

            // 1. Sign Up
            // We pass products and companies in metadata so the server-side trigger handles insertion.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        phone,
                        products: selectedProducts, // Pass array of IDs
                        companies: selectedCompanies // Pass array of tags
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Erro ao criar usuário.')

            // 2. Success
            alert('Cadastro realizado com sucesso! Aguarde a aprovação do administrador.')
            router.push('/login')

        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginBox} style={{ maxWidth: '500px' }}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <img
                            src="/logo-winged-lion.png"
                            alt="PSC+TS"
                            className={styles.logoImage}
                        />
                        <div>
                            <h1>PSC+TS</h1>
                            <span style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                letterSpacing: '0.3em',
                                color: 'var(--color-gold-light)',
                                fontWeight: 300,
                                marginTop: '-5px'
                            }}>CONSULTORIA</span>
                        </div>
                    </div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: 'white',
                        marginTop: '1.5rem',
                        marginBottom: '0.5rem',
                        fontWeight: 600
                    }}>Criar Nova Conta</h2>
                    <p className={styles.subtitle}>
                        Preencha seus dados e escolha seus produtos
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Whatsapp (Telefone)</label>
                        <input
                            type="text"
                            className="input"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="Ex: 11999998888"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Email (Login)</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Senha</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength={6}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label style={{ marginBottom: '10px', display: 'block' }}>
                            Acesso a Empresas <span style={{ color: 'red' }}>*</span>
                        </label>
                        <div style={{
                            display: 'flex', gap: '15px',
                            padding: '10px', border: '1px solid #333', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedCompanies.includes('PSC_TS')}
                                    onChange={(e) => {
                                        const val = 'PSC_TS';
                                        setSelectedCompanies(prev => e.target.checked ? [...prev, val] : prev.filter(v => v !== val))
                                    }}
                                />
                                PSC Consulting + TS
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedCompanies.includes('PSC_CONSORCIOS')}
                                    onChange={(e) => {
                                        const val = 'PSC_CONSORCIOS';
                                        setSelectedCompanies(prev => e.target.checked ? [...prev, val] : prev.filter(v => v !== val))
                                    }}
                                />
                                PSC Consórcios
                            </label>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label style={{ marginBottom: '10px', display: 'block' }}>
                            Produtos de Responsabilidade <span style={{ color: 'red' }}>*</span>
                        </label>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                            maxHeight: '200px', overflowY: 'auto', border: '1px solid #333', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)'
                        }}>
                            {availableProducts
                                .filter(p => selectedCompanies.includes(p.company_tag))
                                .map(product => (
                                    <label key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(product.id)}
                                            onChange={() => handleProductToggle(product.id)}
                                            disabled={loading}
                                        />
                                        {product.nome}
                                    </label>
                                ))}
                            {availableProducts.length === 0 && (
                                <p style={{ fontSize: '12px', color: '#666' }}>Nenhum produto encontrado...</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.buttonContainer}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                        </button>

                        <Link href="/login" className={`btn ${styles.secondaryBtn}`} style={{ textAlign: 'center', textDecoration: 'none' }}>
                            Voltar para Login
                        </Link>
                    </div>
                </form>
            </div>
            <div className={styles.background}>
                <div className={styles.gradient1}></div>
                <div className={styles.gradient2}></div>
                <div className={styles.gradient3}></div>
            </div>
        </div>
    )
}
