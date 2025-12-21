import styles from './PipelineColumn.module.css'
import PipelineCard from './PipelineCard'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    is_urgent: boolean
    produto_interesse: string
    updated_at: string
}

interface Product {
    id: string
    nome: string
}

interface Props {
    title: string
    color: string
    leads: any[]
    products: Product[]
    onDragStart: (e: React.DragEvent, id: string) => void
    onViewLead: (lead: any) => void
    onMoveLead?: (leadId: string, status: string) => void
}

export default function PipelineColumn({ title, color, leads, products, onDragStart, onViewLead, onMoveLead }: Props) {
    return (
        <div className={styles.column}>
            <div className={styles.header} style={{ borderTopColor: color }}>
                <h3>{title}</h3>
                <span className={styles.count}>
                    {leads.length}
                </span>
            </div>

            <div className={styles.list}>
                {leads.map(lead => (
                    <PipelineCard
                        key={lead.id}
                        lead={lead}
                        products={products}
                        onDragStart={onDragStart}
                        onView={onViewLead}
                        onMove={onMoveLead}
                    />
                ))}
            </div>
        </div>
    )
}
