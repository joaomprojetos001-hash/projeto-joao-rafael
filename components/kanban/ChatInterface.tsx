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
    try {
        if (content.trim().startsWith('{')) {
            const parsed = JSON.parse(content);
            if (parsed.output?.mensagem) return parsed.output.mensagem;
            if (parsed.mensagem) return parsed.mensagem;
            if (typeof parsed.output === 'string') return parsed.output;
        }
    } catch {
        // Not valid JSON
    }

    // 2. Clean [Used tools:...] prefix
    if (content.startsWith('[Used tools:')) {
        let depth = 0;
        let endIndex = -1;
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '[') depth++;
            else if (content[i] === ']') depth--;
            if (depth === 0) { endIndex = i; break; }
        }
        return endIndex !== -1 ? content.substring(endIndex + 1).trim() : content;
    }

    return content;
}

const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext || '')) return '📝'
    return '📎'
}

// Convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Remove the data:mime;base64, prefix to get pure base64
            const base64 = result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
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
                setCompanyTag(data.company_tag || 'PSC_TS')
            }
        }
        fetchLeadData()
    }, [leadId])

    useEffect(() => {
        if (!leadPhone) return

        const fetchMessages = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', leadPhone)
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

        return () => { supabase.removeChannel(channel) }
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

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo: 10MB')
            return
        }

        setSelectedFile(file)

        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            setFilePreviewUrl(URL.createObjectURL(file))
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
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()

        const hasText = inputValue.trim()
        const hasFile = selectedFile

        if (!hasText && !hasFile) return
        if (!leadPhone) return

        setUploading(true)

        try {
            let mediaBase64: string | undefined
            let mediaMime: string | undefined
            let mediaType: 'image' | 'video' | 'document' | undefined
            let fileName: string | undefined

            // Convert file to base64
            if (hasFile) {
                mediaBase64 = await fileToBase64(selectedFile)
                mediaMime = selectedFile.type
                mediaType = selectedFile.type.startsWith('image/') ? 'image'
                    : selectedFile.type.startsWith('video/') ? 'video'
                        : 'document'
                fileName = selectedFile.name
            }

            const messageContent = hasText
                ? inputValue
                : (mediaType === 'image' ? '📷 Imagem' : mediaType === 'video' ? '🎥 Vídeo' : `📎 ${fileName}`)

            // Save message to DB (without base64 to keep DB light)
            const newMessage = {
                session_id: leadPhone,
                message: {
                    type: 'ai',
                    content: messageContent,
                    metadata: {
                        origin: 'dashboard_human' as const,
                        ...(mediaType && { mediaType }),
                        ...(fileName && { fileName }),
                        // Store data URI for images/videos (for chat preview)
                        ...(mediaBase64 && (mediaType === 'image' || mediaType === 'video') && {
                            mediaDataUri: `data:${mediaMime};base64,${mediaBase64}`
                        })
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

                // Send to N8N webhook with base64
                fetch('https://api.fabianoportto.shop/webhook/03376cf8-70a8-4642-adf2-431d9216e51f', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: messageContent,
                        lead_id: leadId,
                        phone: leadPhone,
                        company_tag: companyTag,
                        line_id: companyTag === 'PSC_TS' ? '1' : companyTag === 'PSC_CONSORCIOS' ? '2' : '3',
                        // Media fields (base64 ready for Evolution API)
                        ...(mediaBase64 && { mediaBase64 }),
                        ...(mediaMime && { mediaMime }),
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

    // Render media in chat bubbles
    const renderMediaContent = (msg: ChatMessageRow) => {
        const { mediaType, fileName, mediaDataUri } = msg.message.metadata || {}

        if (!mediaType) return null

        if (mediaType === 'image' && mediaDataUri) {
            return (
                <img
                    src={mediaDataUri}
                    alt={fileName || 'Imagem'}
                    className={styles.mediaImage}
                    loading="lazy"
                />
            )
        }

        if (mediaType === 'video' && mediaDataUri) {
            return (
                <video
                    src={mediaDataUri}
                    controls
                    className={styles.mediaVideo}
                    preload="metadata"
                />
            )
        }

        if (mediaType === 'document') {
            return (
                <div className={styles.documentLink}>
                    <span className={styles.documentIcon}>{getFileIcon(fileName || '')}</span>
                    <span className={styles.documentName}>{fileName || 'Documento'}</span>
                </div>
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
                        if (!msg.message) return null // Skip malformed messages
                        const isHuman = msg.message.type === 'human'
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
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

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
