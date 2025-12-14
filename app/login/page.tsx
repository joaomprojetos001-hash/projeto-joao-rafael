'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

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
                        <div className={styles.logoIcon}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="12" fill="url(#gradient)" />
                                <path
                                    d="M20 10L12 18L20 26L28 18L20 10Z"
                                    fill="white"
                                    fillOpacity="0.9"
                                />
                                <path
                                    d="M20 18L16 22L20 26L24 22L20 18Z"
                                    fill="white"
                                    fillOpacity="0.6"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h1>Dashboard de Leads</h1>
                    </div>
                    <p className={styles.subtitle}>
                        Gestão inteligente de atendimento via WhatsApp
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
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

                        <button
                            type="button"
                            className={`btn ${styles.secondaryBtn}`}
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true)
                                setError('')
                                try {
                                    const supabase = createClient()
                                    const { error } = await supabase.auth.signUp({
                                        email,
                                        password,
                                    })
                                    if (error) throw error
                                    alert('Conta criada! Verifique seu email ou faça login.')
                                } catch (err: any) {
                                    setError(err.message)
                                } finally {
                                    setLoading(false)
                                }
                            }}
                        >
                            Criar Conta
                        </button>
                    </div>
                </form>

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
