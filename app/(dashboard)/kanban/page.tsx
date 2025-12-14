'use client'

import { useState, useEffect, Suspense } from 'react'
import ConversationList from '@/components/kanban/ConversationList'
import ChatInterface from '@/components/kanban/ChatInterface'
import LeadInfo from '@/components/kanban/LeadInfo'
import { createClient } from '@/lib/supabase/client'
import styles from './kanban.module.css'

export default function KanbanPage() {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    // Reset selection when unmounting is not strictly necessary but good practice
    // However, for mobile navigation, we just rely on selectedLeadId presence.

    const handleBackToList = () => {
        setSelectedLeadId(null)
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.sidebar} ${selectedLeadId ? styles.hidden : ''}`}>
                <Suspense fallback={<div className={styles.loading}>Carregando conversas...</div>}>
                    <ConversationList
                        selectedLeadId={selectedLeadId}
                        onSelectLead={setSelectedLeadId}
                    />
                </Suspense>
            </div>

            <div className={`${styles.main} ${selectedLeadId ? styles.active : ''}`}>
                {selectedLeadId ? (
                    <div className={styles.chatContainer}>
                        <div className={styles.chatArea}>
                            <ChatInterface
                                leadId={selectedLeadId}
                                onBack={handleBackToList}
                            />
                        </div>
                        <div className={styles.infoArea}>
                            <LeadInfo leadId={selectedLeadId} />
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyContent}>
                            <div className={styles.emptyIcon}>💬</div>
                            <h3>Selecione uma conversa</h3>
                            <p>Escolha um lead na lista ao lado para iniciar o atendimento</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
