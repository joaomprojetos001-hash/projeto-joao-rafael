'use client'

import Link from 'next/link'
import { useState, FormEvent, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className={styles.container}>
                <div className={styles.loginBox}>
                    <div className={styles.header}>
                        <div className={styles.logo}>
                            <img src="/logo-winged-lion.png" alt="PSC+TS" className={styles.logoImage} />
                            <div><h1>PSC+TS</h1></div>
                        </div>
                        <p className={styles.subtitle}>Carregando...</p>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()
    const emailConfirmed = searchParams.get('confirmed') === 'true'

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single()

            console.log("LOGIN DEBUG: Profile Fetch", profile, "Error", profileError);

            if (profileError) {
                console.error("LOGIN ERROR: Failed to fetch profile", profileError)
                throw new Error('Erro ao verificar permissões da conta.')
            }

            // FAIL CLOSED: If profile doesn't exist yet (shouldn't happen with trigger), deny login.
            if (!profile) {
                console.error("LOGIN ERROR: Profile not found for user", (await supabase.auth.getUser()).data.user?.id)
                await supabase.auth.signOut()
                throw new Error('Perfil de usuário não encontrado. Entre em contato com o suporte.')
            }

            if (!profile.is_approved) {
                await supabase.auth.signOut()
                throw new Error('Sua conta ainda não foi aprovada pelo administrador.')
            }

            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginBox}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <img
                            src="/logo-winged-lion.png"
                            alt="PSC+TS"
                            className={styles.logoImage}
                        />
                        {/* Optional: Add text if logo image is icon only. 
                             Assuming logo image might be just the lion based on Sidebar code.
                             Sidebar had text separate. Let's add text here too. */}
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
                    <p className={styles.subtitle}>
                        Gestão inteligente de atendimento via WhatsApp
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {emailConfirmed && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#22c55e',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                            ✅ Email confirmado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.
                        </div>
                    )}

                    {error && (
                        <div className={styles.error}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.buttonContainer}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Processando...' : 'Entrar'}
                        </button>

                    </div>
                </form>

                <div className={styles.buttonContainer} style={{ marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => window.location.href = '/register'}
                        className={`btn ${styles.secondaryBtn}`}
                        style={{
                            width: '100%'
                        }}
                    >
                        Criar Conta
                    </button>
                </div>

                <div className={styles.footer}>
                    <p className="text-sm text-muted">
                        Sistema de gestão centralizada para equipe
                    </p>
                </div>
            </div>

            <div className={styles.background}>
                <div className={styles.gradient1}></div>
                <div className={styles.gradient2}></div>
                <div className={styles.gradient3}></div>
            </div>
        </div>
    )
}
