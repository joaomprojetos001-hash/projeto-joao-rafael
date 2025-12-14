import styles from './PipelineCard.module.css'

interface Props {
    lead: any
    onDragStart: (e: React.DragEvent, id: string) => void
    onView: (lead: any) => void
    onMove?: (leadId: string, newStatus: string) => void
}

export default function PipelineCard({ lead, onDragStart, onView, onMove }: Props) {
    const handleMoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        // Simple prompt approach for mobile speed, can be replaced by modal
        const statusMap: Record<string, string> = {
            'em_atendimento': 'Em Atendimento',
            'em_negociacao': 'Em Negociação',
            'fechado': 'Fechado',
            'nao_respondido': 'Não Respondido'
        }

        // Remove current status from options
        const options = Object.entries(statusMap).filter(([key]) => key !== lead.status)

        // In a real app, use a custom modal. For v1 mobile fix: simple alert/confirm or small native-like logic?
        // Let's rely on a passed prop to open a "Move Modal" at page level or show a list here.
        // For simplicity and speed: Show browser native select prompt or just callback to parent to show a menu

        // BETTER UX: Parent handles "Mobile Move" action which opens a bottom sheet.
        // Let's pass the intent up.
        if (onMove) {
            // We'll just cycle or open a specific "Change Status" view? 
            // Let's open a simple selection by calling onMove with null (to trigger menu) or just let parent handle it.
            // Actually, parent needs to know WHICH lead.
            onMove(lead.id, '') // Empty string signals "Request Move Menu"
        }
    }

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

            {lead.produto_interesse && (
                <div className={styles.product}>
                    Produto ID: {lead.produto_interesse}
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
