'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import styles from './dashboard-layout.module.css'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    return (
        <div className={styles.dashboardContainer}>
            <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onCollapse={setIsSidebarCollapsed}
            />
            <main
                className={`${styles.mainContent} ${isSidebarCollapsed ? styles.collapsed : ''}`}
            >
                {children}
            </main>
        </div>
    )
}

