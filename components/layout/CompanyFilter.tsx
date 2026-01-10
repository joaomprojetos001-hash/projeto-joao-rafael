'use client'

import { useCompany, CompanyTag } from '@/context/CompanyContext'
import { useState, useRef, useEffect } from 'react'

export function CompanyFilter() {
    const { selectedCompany, setCompany, allowedCompanies, isLoading } = useCompany()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (isLoading || allowedCompanies.length <= 1) return null

    const getLabel = (tag: CompanyTag) => {
        switch (tag) {
            case 'PSC_TS': return 'PSC Consulting + TS'
            case 'PSC_CONSORCIOS': return 'PSC Consórcios'
            case 'ALL': return 'Grupo PSC (Visão Geral)'
            default: return tag
        }
    }

    const getColor = (tag: CompanyTag) => {
        switch (tag) {
            case 'PSC_TS': return 'var(--color-gold)'
            case 'PSC_CONSORCIOS': return '#10b981' // Emerald green
            case 'ALL': return '#6366f1' // Indigo
            default: return 'white'
        }
    }

    return (
        <div className="relative" ref={dropdownRef} style={{ position: 'relative', minWidth: '200px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getColor(selectedCompany)
                    }} />
                    <span style={{ fontSize: '0.875rem' }}>{getLabel(selectedCompany)}</span>
                </div>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                }}>
                    {allowedCompanies.map(tag => (
                        <button
                            key={tag}
                            onClick={() => {
                                setCompany(tag)
                                setIsOpen(false)
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                backgroundColor: selectedCompany === tag ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: selectedCompany === tag ? 'white' : '#a1a1aa',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.875rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedCompany === tag ? 'rgba(255,255,255,0.1)' : 'transparent'}
                        >
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: getColor(tag)
                            }} />
                            {getLabel(tag)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
