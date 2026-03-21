import styles from './PipelineCard.module.css'

interface Product {
    id: string
    nome: string
}

// Extract clean product ID from potentially dirty values like "Name- UUID;"
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function resolveProductName(produtoInteresse: string | null | undefined, products: Product[]): string | null {
    if (!produtoInteresse) return null

    // 1. Direct UUID match
    const directMatch = products.find(p => p.id === produtoInteresse)
    if (directMatch) return directMatch.nome

    // 2. Try to extract UUID from concatenated string (e.g. "Empréstimo Consignado- UUID")
    const uuidMatch = produtoInteresse.match(UUID_REGEX)
    if (uuidMatch) {
        const extracted = products.find(p => p.id === uuidMatch[0])
        if (extracted) return extracted.nome
    }

    // 3. Try matching by product name
    const nameMatch = products.find(p => p.nome.toLowerCase() === produtoInteresse.toLowerCase())
    if (nameMatch) return nameMatch.nome

    // 4. Try partial name match (value starts with product name)
    const partialMatch = products.find(p => produtoInteresse.toLowerCase().startsWith(p.nome.toLowerCase()))
    if (partialMatch) return partialMatch.nome

    // 5. Fallback: display cleaned value (strip UUID if present)
    return produtoInteresse.replace(UUID_REGEX, '').replace(/[-–;]+\s*$/, '').trim() || null
}

interface Props {
    lead: any
    products: Product[]
    lastMessage?: string
    onDragStart: (e: React.DragEvent, id: string) => void
    onView: (lead: any) => void
    onMove?: (leadId: string, newStatus: string) => void
    onGoToConversation?: (leadId: string) => void
}

export default function PipelineCard({ lead, products, lastMessage, onDragStart, onView, onMove, onGoToConversation }: Props) {
    const handleMoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onMove) {
            onMove(lead.id, '')
        }
    }

    const handleGoToConversation = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onGoToConversation) {
            onGoToConversation(lead.id)
        }
    }

    const productName = resolveProductName(lead.produto_interesse, products)

    return (
        <div
            className={styles.card}
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
        >
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={styles.name}>{lead.name || lead.phone}</span>
                    {lead.company_tag && (
                        <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            backgroundColor: lead.company_tag === 'PSC_CONSORCIOS' ? '#10b981' : '#d4af37',
                            color: 'white',
                            fontWeight: 'bold'
                        }}>
                            {lead.company_tag === 'PSC_CONSORCIOS' ? 'PSC' : 'PSC+TS'}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {lead.is_blocked && <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>🚫</span>}
                    {lead.is_urgent && <span className={styles.urgent}>!!!</span>}
                </div>
            </div>

            {productName && (
                <div className={styles.product}>
                    {productName}
                </div>
            )}

            {lastMessage && (
                <div className={styles.lastMessage}>
                    <span className={styles.lastMessageIcon}>💬</span>
                    <span className={styles.lastMessageText}>
                        {lastMessage.length > 60 ? lastMessage.substring(0, 60) + '...' : lastMessage}
                    </span>
                </div>
            )}

            <div className={styles.footer}>
                <span className={styles.time}>
                    {new Date(lead.created_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {onMove && (
                        <button className={styles.moveBtn} onClick={handleMoveClick}>
                            Mover
                        </button>
                    )}
                    {onGoToConversation && (
                        <button className={styles.conversaBtn} onClick={handleGoToConversation}>
                            💬 Conversa
                        </button>
                    )}
                    <button className={styles.actionBtn} onClick={() => onView(lead)}>Ver</button>
                </div>
            </div>
        </div>
    )
}
