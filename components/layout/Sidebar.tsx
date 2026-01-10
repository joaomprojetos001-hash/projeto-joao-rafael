'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './Sidebar.module.css'
import { LayoutDashboard, Kanban, GitPullRequest, MessageSquare, Phone, LogOut, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CompanyFilter } from './CompanyFilter'

const baseMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Kanban', href: '/kanban', icon: <Kanban size={20} /> },
    { name: 'Pipeline', href: '/pipeline', icon: <GitPullRequest size={20} /> },
    { name: 'Follow-up', href: '/follow-up', icon: <MessageSquare size={20} /> },
    // WhatsApp and Admin will be conditional
]

interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
    onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ isOpen = false, onClose, onCollapse }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loadingRole, setLoadingRole] = useState(true)

    useEffect(() => {
        const checkRole = async () => {
            console.log("Sidebar: Checking role...")
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                console.log("Sidebar: Profile fetch result:", profile, "Error:", error)

                if (profile?.role === 'admin') {
                    console.log("Sidebar: User IS admin!")
                    setIsAdmin(true)
                } else {
                    console.log("Sidebar: User is NOT admin.", profile?.role)
                }
            }
            setLoadingRole(false)
        }
        checkRole()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const toggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        if (onCollapse) onCollapse(newState)
    }

    // Build the final menu
    const menuItems = [...baseMenuItems]

    if (isAdmin) {
        menuItems.push({ name: 'WhatsApp', href: '/whatsapp', icon: <Phone size={20} /> })
    }

    // Configuração is available for everyone, but destination differs
    menuItems.push({
        name: 'Configuração',
        href: isAdmin ? '/admin' : '/profile',
        icon: <Settings size={20} />
    })

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
                onClick={onClose}
            />
            <aside
                className={`
                    ${styles.sidebar} 
                    ${isOpen ? styles.open : ''} 
                    ${isCollapsed ? styles.collapsed : ''}
                `}
            >
                {/* Toggle Button (Desktop Only) */}
                <button
                    className={styles.collapseBtn}
                    onClick={toggleCollapse}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {/* Logo */}
                <div className={styles.logo}>
                    <div className={styles.logoImage}>
                        <img
                            src="/logo-winged-lion.png"
                            alt="PSC Consultoria"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 8px rgba(218, 165, 32, 0.3))'
                            }}
                        />
                    </div>
                    {!isCollapsed && (
                        <div className={styles.logoText}>
                            <span className={styles.companyName}>PSC+TS</span>
                            <span className={styles.companySubtitle}>CONSULTORIA</span>
                        </div>
                    )}
                </div>

                <div style={{ padding: '0 12px 12px 12px' }}>
                    <CompanyFilter />
                </div>

                <nav className={styles.nav}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={onClose}
                                title={isCollapsed ? item.name : ''}
                            >
                                <div className={styles.navIcon}>{item.icon}</div>
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                <div className={styles.footer}>
                    <button onClick={handleLogout} className={styles.logoutBtn} title={isCollapsed ? "Sair" : ''}>
                        <LogOut size={20} />
                        {!isCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}

