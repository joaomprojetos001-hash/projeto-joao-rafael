import styles from './AdminTabs.module.css'
import { CheckSquare, BarChart3, Users, FileText, Settings } from 'lucide-react'

interface Props {
    activeTab: string
    onTabChange: (tab: string) => void
}

export default function AdminTabs({ activeTab, onTabChange }: Props) {
    const tabs = [
        { id: 'approvals', label: 'Aprovações', icon: CheckSquare },
        { id: 'analytics', label: 'Relatórios', icon: BarChart3 },
        { id: 'agents', label: 'Agentes', icon: Users },
        { id: 'logs', label: 'Logs', icon: FileText },
        { id: 'settings', label: 'Configuração', icon: Settings },
    ]

    return (
        <div className={styles.container}>
            {tabs.map(tab => {
                const Icon = tab.icon
                return (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <Icon size={18} />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
