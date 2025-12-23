'use client'

import { useTheme } from '@/components/providers/ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import styles from '@/app/(dashboard)/admin/AdminDashboard.module.css'

export default function AdminSettings() {
    const { theme, toggleTheme } = useTheme()

    return (
        <div className={styles.card}>
            <h2>⚙️ Configurações Administrativas</h2>

            <div className={styles.settingRow}>
                <div>
                    <h3>Aparência do Sistema</h3>
                    <p className="text-secondary" style={{ color: 'var(--color-text-secondary)' }}>Alterne entre modo claro e escuro</p>
                </div>
                <button
                    onClick={toggleTheme}
                    className="btn btn-secondary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        justifyContent: 'center'
                    }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </button>
            </div>
        </div>
    )
}
