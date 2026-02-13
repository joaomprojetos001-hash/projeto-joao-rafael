'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessageRow, ChatMessageContent } from '@/types/chat'
import styles from './ChatInterface.module.css'

import LeadInfo from './LeadInfo'

interface Props {
    leadId: string
    onBack?: () => void
}

const cleanMessageContent = (content: string) => {
    if (!content) return content;

    // 1. Try to parse JSON output format from AI agents
    // Format: {"output":{"requisicao_inicial":false,"mensagem":"..."}}
    try {
        // Check if content looks like JSON
        if (content.trim().startsWith('{')) {
            const parsed = JSON.parse(content);
            // Handle nested output.mensagem
            if (parsed.output?.mensagem) {
                return parsed.output.mensagem;
            }
            // Handle direct mensagem field
            if (parsed.mensagem) {
                return parsed.mensagem;
            }
            // Handle output as string
            if (typeof parsed.output === 'string') {
                return parsed.output;
            }
        }
    } catch {
        // Not valid JSON, continue with other cleaning
    }

    // 2. Clean [Used tools:...] prefix
    if (content.startsWith('[Used tools:')) {
        let depth = 0;
        let endIndex = -1;

        for (let i = 0; i < content.length; i++) {
            if (content[i] === '[') depth++;
            else if (content[i] === ']') depth--;

            if (depth === 0) {
                endIndex = i;
                break;
            }
        }

        return endIndex !== -1 ? content.substring(endIndex + 1).trim() : content;
    }

    return content;
}

// Helper to get file extension icon
const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext || '')) return '📝'
    return '📎'
}

export default function ChatInterface({ leadId, onBack }: Props) {
    const [messages, setMessages] = useState<ChatMessageRow[]>([])
    const [inputValue, setInputValue] = useState('')
    const [leadPhone, setLeadPhone] = useState<string>('')
    const [leadName, setLeadName] = useState<string>('')
    const [companyTag, setCompanyTag] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showLeadInfo, setShowLeadInfo] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Attachment state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)

    // Buscar telefone e nome do lead
    useEffect(() => {
        const fetchLeadData = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('leads')
                .select('phone, name, company_tag')
                .eq('id', leadId)
                .single()

            if (data) {
                setLeadPhone(data.phone)
                setLeadName(data.name)
                setCompanyTag(data.company_tag || 'PSC_TS') // Default if empty
            }
        }
        fetchLeadData()
    }, [leadId])

    // Buscar mensagens e Realtime
    useEffect(() => {
        if (!leadPhone) return

        const fetchMessages = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', leadPhone)
                // Filter to only show conversation items
                .in('message->>type', ['human', 'ai'])
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            setLoading(false)
            scrollToBottom()
        }

        fetchMessages()

        const supabase = createClient()
        const channel = supabase
            .channel(`chat:${leadPhone}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${leadPhone}` },
                (payload) => {
                    setMessages(current => [...current, payload.new as ChatMessageRow])
                    scrollToBottom()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [leadPhone])

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    // File handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo: 10MB')
            return
        }

        setSelectedFile(file)

        // Generate preview for images
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setFilePreviewUrl(url)
        } else {
            setFilePreviewUrl(null)
        }
    }

    const clearFile = () => {
        setSelectedFile(null)
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl)
            setFilePreviewUrl(null)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const uploadFile = async (file: File): Promise<{ url: string; mediaType: 'image' | 'document' } | null> => {
        const supabase = createClient()
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${leadPhone}/${timestamp}_${safeName}`

        const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error('Upload error:', error)
            return null
        }

        const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(data.path)

        const mediaType = file.type.startsWith('image/') ? 'image' : 'document'

        return { url: urlData.publicUrl, mediaType }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()

        const hasText = inputValue.trim()
        const hasFile = selectedFile

        if (!hasText && !hasFile) return
        if (!leadPhone) return

        setUploading(true)

        try {
            let mediaUrl: string | undefined
            let mediaType: 'image' | 'document' | undefined
            let fileName: string | undefined

            // Upload file if selected
            if (hasFile) {
                const result = await uploadFile(selectedFile)
                if (!result) {
                    alert('Erro ao enviar arquivo. Tente novamente.')
                    setUploading(false)
                    return
                }
                mediaUrl = result.url
                mediaType = result.mediaType
                fileName = selectedFile.name
            }

            const messageContent = hasText
                ? inputValue
                : (mediaType === 'image' ? '📷 Imagem' : `📎 ${fileName}`)

            const newMessage = {
                session_id: leadPhone,
                message: {
                    type: 'ai', // Registra como AI para o cliente ver como resposta da empresa
                    content: messageContent,
                    metadata: {
                        origin: 'dashboard_human',
                        ...(mediaUrl && { mediaUrl }),
                        ...(mediaType && { mediaType }),
                        ...(fileName && { fileName })
                    }
                }
            }

            const supabase = createClient()
            const { error } = await supabase
                .from('messages')
                .insert(newMessage)

            if (!error) {
                setInputValue('')
                clearFile()

                // Disparar Webhook N8N (sem bloquear UI)
                fetch('https://api.fabianoportto.shop/webhook/03376cf8-70a8-4642-adf2-431d9216e51f', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: messageContent,
                        lead_id: leadId,
                        phone: leadPhone,
                        company_tag: companyTag,
                        line_id: companyTag === 'PSC_TS' ? '1' : companyTag === 'PSC_CONSORCIOS' ? '2' : '3',
                        ...(mediaUrl && { mediaUrl }),
                        ...(mediaType && { mediaType }),
                        ...(fileName && { fileName })
                    })
                }).catch(err => console.error('Erro no webhook N8N:', err))

            } else {
                console.error('Erro ao enviar:', error)
                alert('Erro ao enviar mensagem')
            }
        } finally {
            setUploading(false)
        }
    }

    // Render media content in bubbles
    const renderMediaContent = (msg: ChatMessageRow) => {
        const { mediaUrl, mediaType, fileName } = msg.message.metadata || {}

        if (!mediaUrl) return null

        if (mediaType === 'image') {
            return (
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaLink}>
                    <img
                        src={mediaUrl}
                        alt={fileName || 'Imagem'}
                        className={styles.mediaImage}
                        loading="lazy"
                    />
                </a>
            )
        }

        if (mediaType === 'document') {
            return (
                <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.documentLink}
                >
                    <span className={styles.documentIcon}>{getFileIcon(fileName || '')}</span>
                    <span className={styles.documentName}>{fileName || 'Documento'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </a>
            )
        }

        return null
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {onBack && (
                        <button onClick={onBack} className={styles.backButton}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                    )}
                    <div className={styles.headerTitle}>
                        <h3>{leadName || 'Carregando...'}</h3>
                        <span>{leadPhone}</span>
                    </div>
                </div>
                <button
                    className={styles.optionsButton}
                    onClick={() => setShowLeadInfo(true)}
                    title="Informações do Lead"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>

            <div className={styles.messagesList}>
                {loading ? (
                    <div className={styles.loading}>Carregando mensagens...</div>
                ) : (
                    messages.map((msg) => {
                        const isHuman = msg.message.type === 'human'
                        // Se for AI, verifica se foi um humano do dashboard
                        const isDashboardAgent = msg.message.metadata?.origin === 'dashboard_human'

                        return (
                            <div
                                key={msg.id}
                                className={`${styles.messageWrapper} ${!isHuman ? styles.wrapperAi : styles.wrapperHuman}`}
                            >
                                <div className={`${styles.bubble} ${!isHuman ? styles.bubbleAi : styles.bubbleHuman}`}>
                                    {renderMediaContent(msg)}
                                    <p>{cleanMessageContent(msg.message.content)}</p>
                                    <span className={styles.timestamp}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isDashboardAgent && <span title="Enviado por atendente"> 👤</span>}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* File Preview Bar */}
            {selectedFile && (
                <div className={styles.filePreview}>
                    <div className={styles.filePreviewContent}>
                        {filePreviewUrl ? (
                            <img src={filePreviewUrl} alt="Preview" className={styles.previewThumbnail} />
                        ) : (
                            <span className={styles.previewIcon}>{getFileIcon(selectedFile.name)}</span>
                        )}
                        <span className={styles.previewName}>{selectedFile.name}</span>
                        <span className={styles.previewSize}>
                            {(selectedFile.size / 1024).toFixed(0)}KB
                        </span>
                    </div>
                    <button onClick={clearFile} className={styles.previewRemove} title="Remover arquivo">
                        ✕
                    </button>
                </div>
            )}

            <form onSubmit={handleSendMessage} className={styles.inputArea}>
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Attach button */}
                <button
                    type="button"
                    className={styles.attachButton}
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar arquivo"
                    disabled={uploading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                </button>

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite sua resposta..."
                    className={styles.input}
                    disabled={uploading}
                />
                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={(!inputValue.trim() && !selectedFile) || uploading}
                >
                    {uploading ? (
                        <div className={styles.spinner} />
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
            </form>

            {/* Lead Info Modal (Mobile/Drawer) */}
            {showLeadInfo && (
                <div className={styles.modalOverlay} onClick={() => setShowLeadInfo(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <LeadInfo leadId={leadId} onClose={() => setShowLeadInfo(false)} />
                    </div>
                </div>
            )}
        </div>
    )
}
