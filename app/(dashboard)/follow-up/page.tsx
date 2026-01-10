'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CampaignList from '@/components/follow-up/CampaignList'
import CreateCampaignModal from '@/components/follow-up/CreateCampaignModal'
import styles from './follow-up.module.css'
import { useCompany } from '@/context/CompanyContext'

export default function FollowUpPage() {
    const { selectedCompany, setCompany } = useCompany()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleCampaignCreated = () => {
        setRefreshTrigger(prev => prev + 1)
        setIsModalOpen(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                        <h1>Campanhas de Follow-up</h1>
                        <p className={styles.subtitle}>Automatize o contato com seus leads</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
                        <button
                            className="btn"
                            style={{
                                backgroundColor: selectedCompany === 'PSC_TS' ? 'var(--color-gold)' : 'transparent',
                                color: selectedCompany === 'PSC_TS' ? 'black' : 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                fontWeight: selectedCompany === 'PSC_TS' ? 'bold' : 'normal',
                                padding: '6px 12px',
                                fontSize: '0.8rem'
                            }}
                            onClick={() => setCompany('PSC_TS')}
                        >
                            PSC+TS
                        </button>
                        <button
                            className="btn"
                            style={{
                                backgroundColor: selectedCompany === 'PSC_CONSORCIOS' ? '#10b981' : 'transparent',
                                color: selectedCompany === 'PSC_CONSORCIOS' ? 'white' : 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                fontWeight: selectedCompany === 'PSC_CONSORCIOS' ? 'bold' : 'normal',
                                padding: '6px 12px',
                                fontSize: '0.8rem'
                            }}
                            onClick={() => setCompany('PSC_CONSORCIOS')}
                        >
                            PSC Consórcios
                        </button>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        + Nova Campanha
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <CampaignList key={`${refreshTrigger}-${selectedCompany}`} />
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
