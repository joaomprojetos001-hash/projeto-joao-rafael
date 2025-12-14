export interface ChatMessageContent {
    type: 'human' | 'ai'
    content: string
    metadata?: {
        origin?: 'dashboard_human' | 'n8n_ai'
        [key: string]: any
    }
}

export interface ChatMessageRow {
    id: number
    session_id: string
    message: ChatMessageContent
    created_at: string
}
