import styles from './PipelineCard.module.css'

interface Product {
    id: string
    nome: string
}

interface Props {
    lead: any
    products: Product[]
    onDragStart: (e: React.DragEvent, id: string) => void
    onView: (lead: any) => void
    onMove?: (leadId: string, newStatus: string) => void
}

export default function PipelineCard({ lead, products, onDragStart, onView, onMove }: Props) {
    const handleMoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onMove) {
            onMove(lead.id, '')
        }
    }

    // Check if produto_interesse is a UUID or a name
    const productName = lead.produto_interesse
        ? (
            // Try to find by ID first
            products.find(p => p.id === lead.produto_interesse)?.nome ||
            // If not found, try to find by name (case where produto_interesse stores the name)
            products.find(p => p.nome.toLowerCase() === lead.produto_interesse?.toLowerCase())?.nome ||
            // If still not found but there's a value, just display it directly
            lead.produto_interesse
        )
        : null

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

            <div className={styles.footer}>
                <span className={styles.time}>
                    {new Date(lead.updated_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {onMove && (
                        <button className={styles.moveBtn} onClick={handleMoveClick}>
                            Mover
                        </button>
                    )}
                    <button className={styles.actionBtn} onClick={() => onView(lead)}>Ver</button>
                </div>
            </div>
        </div>
    )
}
