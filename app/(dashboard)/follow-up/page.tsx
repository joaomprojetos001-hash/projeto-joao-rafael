'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CampaignList from '@/components/follow-up/CampaignList'
import CreateCampaignModal from '@/components/follow-up/CreateCampaignModal'
import styles from './follow-up.module.css'

export default function FollowUpPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleCampaignCreated = () => {
        setRefreshTrigger(prev => prev + 1)
        setIsModalOpen(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Campanhas de Follow-up</h1>
                    <p className={styles.subtitle}>Automatize o contato com seus leads</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsModalOpen(true)}
                >
                    + Nova Campanha
                </button>
            </div>

            <div className={styles.content}>
                <CampaignList key={refreshTrigger} />
            </div>

            {isModalOpen && (
                <CreateCampaignModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleCampaignCreated}
                />
            )}
        </div>
    )
}
