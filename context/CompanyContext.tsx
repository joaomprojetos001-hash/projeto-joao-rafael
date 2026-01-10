'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type CompanyTag = 'PSC_TS' | 'PSC_CONSORCIOS' | 'ALL'

interface CompanyContextType {
    selectedCompany: CompanyTag
    setCompany: (company: CompanyTag) => void
    allowedCompanies: CompanyTag[]
    isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
    const [selectedCompany, setSelectedCompany] = useState<CompanyTag>('PSC_TS')
    const [allowedCompanies, setAllowedCompanies] = useState<CompanyTag[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchUserCompanies = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setIsLoading(false)
                    return
                }

                // Check for admin role first (admins usually see all)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    setAllowedCompanies(['PSC_TS', 'PSC_CONSORCIOS', 'ALL'])
                    // Load preference from local storage or default to ALL
                    const saved = localStorage.getItem('selectedCompany') as CompanyTag
                    if (saved) setSelectedCompany(saved)
                    else setSelectedCompany('ALL')
                } else {
                    // Fetch from user_companies table
                    // Note: This table needs to be populated by migration or sign-up flow
                    const { data: companies } = await supabase
                        .from('user_companies')
                        .select('company_tag')
                        .eq('user_id', user.id)

                    if (companies && companies.length > 0) {
                        // Map database enum to our type
                        // @ts-ignore
                        const tags: CompanyTag[] = companies.map(c => c.company_tag)

                        // If user has access to multiple, add 'ALL'? 
                        // Maybe only if explicitly configured, but for now let's assume if > 1 then ALL is allowed.
                        if (tags.length > 1) {
                            tags.push('ALL')
                        }

                        setAllowedCompanies(tags)

                        const saved = localStorage.getItem('selectedCompany') as CompanyTag
                        if (saved && tags.includes(saved)) {
                            setSelectedCompany(saved)
                        } else {
                            setSelectedCompany(tags[0])
                        }
                    } else {
                        // Fallback for existing users before migration: Default to PSC_TS
                        setAllowedCompanies(['PSC_TS'])
                        setSelectedCompany('PSC_TS')
                    }
                }
            } catch (error) {
                console.error('Error fetching companies:', error)
                // Fallback safe
                setAllowedCompanies(['PSC_TS'])
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserCompanies()
    }, [])

    const setCompany = (company: CompanyTag) => {
        setSelectedCompany(company)
        localStorage.setItem('selectedCompany', company)
    }

    return (
        <CompanyContext.Provider value={{ selectedCompany, setCompany, allowedCompanies, isLoading }}>
            {children}
        </CompanyContext.Provider>
    )
}

export function useCompany() {
    const context = useContext(CompanyContext)
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider')
    }
    return context
}
