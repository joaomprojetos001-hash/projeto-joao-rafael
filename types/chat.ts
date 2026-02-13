export interface ChatMessageContent {
    type: 'human' | 'ai'
    content: string
    metadata?: {
        origin?: 'dashboard_human' | 'n8n_ai'
        mediaUrl?: string
        mediaType?: 'image' | 'document'
        fileName?: string
        [key: string]: any
    }
}

export interface ChatMessageRow {
    id: number
    session_id: string
    message: ChatMessageContent
    created_at: string
}
