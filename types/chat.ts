export interface ChatMessageContent {
    type: 'human' | 'ai'
    content: string
    metadata?: {
        origin?: 'dashboard_human' | 'n8n_ai'
        mediaType?: 'image' | 'video' | 'document'
        fileName?: string
        mediaDataUri?: string  // data:mime;base64,... for small file inline display
        mediaUrl?: string      // public URL for large files (Supabase Storage)
        [key: string]: any
    }
}

export interface ChatMessageRow {
    id: number
    session_id: string
    message: ChatMessageContent
    created_at: string
}
