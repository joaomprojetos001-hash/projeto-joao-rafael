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

    const productName = lead.produto_interesse
        ? products.find(p => p.id === lead.produto_interesse)?.nome || 'Produto Desconhecido'
        : null

    return (
        <div
            className={styles.card}
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
        >
            <div className={styles.header}>
                <span className={styles.name}>{lead.name || lead.phone}</span>
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
