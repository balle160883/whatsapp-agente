'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChatTeardropDots,
  MagnifyingGlass,
  Robot,
  User,
  DownloadSimple,
  CircleNotch,
  Warning,
  Sparkle,
  Envelope,
  CalendarBlank,
  Stethoscope,
  Note,
  ToggleLeft,
  ToggleRight,
  PaperPlaneTilt,
  Megaphone,
} from '@phosphor-icons/react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

interface Conversation {
  id: string
  status: string
  botActive: boolean
  sentiment: string | null
  isHighPriority: boolean
  contact: { fullName: string | null; phone: string }
  lastMessage: { content: string; createdAt: string; sender: string; direction: string } | null
  lastMessageAt: string | null
}

interface Message {
  id: string
  content: string
  sender: 'CLIENT' | 'BOT' | 'HUMAN'
  direction: 'INCOMING' | 'OUTGOING'
  createdAt: string
  metadata?: {
    isInternal?: boolean
  } | null
}

interface Contact {
  fullName: string | null
  phone: string
  isNewPatient: boolean
  metadata?: {
    email?: string | null
    birthdate?: string | null
    reason?: string | null
    allergies?: string | null
    notes?: string | null
    assignedToId?: string | null
    assignedToName?: string | null
  } | null
}

interface ConversationDetail {
  id: string
  status: string
  botActive: boolean
  contact: Contact
  messages: Message[]
}

interface Agent {
  id: string
  name: string
  role: string
}

const APPROVED_TEMPLATES = [
  {
    name: 'hello_world',
    label: 'Bienvenida (Hello World)',
    language: 'en_US',
    text: '¡Hola! Bienvenido a nuestro servicio de atención. ¿En qué podemos ayudarte?',
  },
  {
    name: 'appointment_confirmation',
    label: 'Confirmación de Cita',
    language: 'es',
    text: '¡Hola! Te confirmamos que tu cita ha sido programada con éxito.',
  },
  {
    name: 'appointment_reminder',
    label: 'Recordatorio de Cita',
    language: 'es',
    text: '¡Hola! Te recordamos tu cita agendada para el próximo día.',
  },
  {
    name: 'nps_survey',
    label: 'Encuesta NPS',
    language: 'es',
    text: '¡Hola! Califica el servicio recibido de 0 a 5 estrellas.',
  },
]

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  const date = parseISO(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Ayer'
  return format(date, 'd MMM', { locale: es })
}

function SentimentBadge({
  sentiment,
  isHighPriority,
}: {
  sentiment: string | null
  isHighPriority: boolean
}) {
  if (isHighPriority) {
    return <span className="badge badge-danger">⚠️ Prioridad</span>
  }
  if (sentiment === 'POSITIVE') {
    return <span className="badge badge-success">😊 Positivo</span>
  }
  if (sentiment === 'NEGATIVE') {
    return <span className="badge badge-danger">😠 Negativo</span>
  }
  return <span className="badge badge-muted">😐 Neutral</span>
}

function StatusBadge({ status, botActive }: { status: string; botActive: boolean }) {
  if (status === 'HUMAN_HANDOFF') return <span className="badge badge-warning">Handoff</span>
  if (status === 'CLOSED') return <span className="badge badge-muted">Cerrado</span>
  if (!botActive) return <span className="badge badge-warning">Manual</span>
  return <span className="badge badge-success">Bot activo</span>
}

function getAvatarBgColor(name: string) {
  const colors = [
    'linear-gradient(135deg, #6172f3, #4a56e8)',
    'linear-gradient(135deg, #25d366, #128c7e)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOutgoing = msg.direction === 'OUTGOING'
  const isInternal = msg.metadata?.isInternal === true

  const bubbleClass =
    msg.sender === 'CLIENT'
      ? 'chat-bubble chat-bubble-client'
      : msg.sender === 'BOT'
        ? 'chat-bubble chat-bubble-bot'
        : 'chat-bubble chat-bubble-human'

  const internalStyles: React.CSSProperties = isInternal
    ? {
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px dashed rgba(245, 158, 11, 0.45)',
        borderBottomRightRadius: '4px',
        marginLeft: 'auto',
      }
    : {}

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: '0.875rem',
      }}
    >
      <div
        style={{
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        {isInternal ? (
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔒 Nota Interna - Agente</span>
        ) : (
          <>
            {msg.sender === 'BOT' && <Robot size={10} />}
            {msg.sender === 'HUMAN' && <User size={10} />}
            {msg.sender === 'CLIENT' ? 'Cliente' : msg.sender === 'BOT' ? 'Bot IA' : 'Agente'}
          </>
        )}
      </div>

      <div className={bubbleClass} style={internalStyles}>
        {msg.content}
        <div
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '0.25rem',
            textAlign: 'right',
          }}
        >
          {format(parseISO(msg.createdAt), 'HH:mm', { locale: es })}
        </div>
      </div>
    </div>
  )
}

function InboxComponent() {
  const searchParams = useSearchParams()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Selected Conversation details states
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [togglingBot, setTogglingBot] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [isInternalMode, setIsInternalMode] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // CRM/Agent states
  const [agents, setAgents] = useState<Agent[]>([])
  const [assigning, setAssigning] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/conversations${params}`)
      const data = (await res.json()) as { conversations: Conversation[] }
      setConversations(data.conversations ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }, [filter])

  // 2. Fetch selected conversation details
  const fetchDetail = useCallback(async (convId: string, silent = false) => {
    try {
      if (!silent) setLoadingDetail(true)
      const res = await fetch(`/api/conversations/${convId}`)
      if (res.ok) {
        const data = (await res.json()) as ConversationDetail
        setDetail(data)
      }
    } catch (e) {
      console.error('Error fetching detail:', e)
    } finally {
      if (!silent) setLoadingDetail(false)
    }
  }, [])

  // 3. Init load (read selected from URL if present)
  useEffect(() => {
    const urlSelectedId = searchParams?.get('selected')
    if (urlSelectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(urlSelectedId)
    }
  }, [searchParams])

  // Fetch list periodically
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchConversations()
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Fetch selected conversation details on selection
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null)
      return
    }
    void fetchDetail(selectedId, false)
  }, [selectedId, fetchDetail])

  // Poll active chat more frequently (every 4 seconds)
  useEffect(() => {
    if (!selectedId) return
    const interval = setInterval(() => {
      void fetchDetail(selectedId, true)
    }, 4000)
    return () => clearInterval(interval)
  }, [selectedId, fetchDetail])

  // Fetch agents list once
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = (await res.json()) as Agent[]
          setAgents(data)
        }
      } catch (e) {
        console.error('Error fetching agents:', e)
      }
    }
    void fetchAgents()
  }, [])

  // Scroll active chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.messages.length])

  // Toggle bot active / inactive
  async function handleToggleBot() {
    if (!detail) return
    setTogglingBot(true)
    try {
      const res = await fetch(`/api/conversations/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: !detail.botActive }),
      })
      if (res.ok) {
        setDetail((prev) => (prev ? { ...prev, botActive: !prev.botActive } : prev))
        // Update list status immediately
        setConversations((prev) =>
          prev.map((c) => (c.id === detail.id ? { ...c, botActive: !detail.botActive } : c))
        )
      }
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingBot(false)
    }
  }

  // Assign agent CRM
  async function handleAssignAgent(agentId: string) {
    if (!detail) return
    setAssigning(true)
    const selectedAgent = agents.find((a) => a.id === agentId)
    const assignedToId = agentId || null
    const assignedToName = selectedAgent ? selectedAgent.name : null

    try {
      const res = await fetch(`/api/conversations/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId, assignedToName }),
      })
      if (res.ok) {
        setDetail((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            contact: {
              ...prev.contact,
              metadata: {
                ...prev.contact.metadata,
                assignedToId,
                assignedToName,
              },
            },
          }
        })
      }
    } catch (e) {
      console.error('Error assigning agent:', e)
    } finally {
      setAssigning(false)
    }
  }

  // Request Suggested AI Response
  async function handleRequestSuggestion() {
    if (!detail || suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch(`/api/conversations/${detail.id}/suggest`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = (await res.json()) as { suggestion: string }
        if (data.suggestion) {
          setMessageInput(data.suggestion)
        }
      }
    } catch (e) {
      console.error('Error fetching suggestion:', e)
    } finally {
      setSuggesting(false)
    }
  }

  // Send regular message or internal note
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!detail || !messageInput.trim() || sending) return

    setSending(true)
    const text = messageInput
    setMessageInput('')

    try {
      const res = await fetch(`/api/conversations/${detail.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, isInternal: isInternalMode }),
      })

      if (res.ok) {
        const newMsg = (await res.json()) as Message
        setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev))
        setIsInternalMode(false)
        // Refresh conversations list to show newest last message
        void fetchConversations()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  // Send template message
  async function handleSendTemplate(tpl: (typeof APPROVED_TEMPLATES)[number]) {
    if (!detail || sending) return
    setSending(true)
    setShowTemplates(false)

    try {
      const res = await fetch(`/api/conversations/${detail.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: tpl.name,
          languageCode: tpl.language,
          templateText: tpl.text,
        }),
      })

      if (res.ok) {
        const newMsg = (await res.json()) as Message
        setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev))
        void fetchConversations()
      } else {
        const err = await res.json()
        alert(`Error al enviar plantilla: ${err.error || 'error desconocido'}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  // Filter list by search keyword
  const filteredConversations = conversations.filter((c) => {
    const name = c.contact.fullName?.toLowerCase() ?? c.contact.phone
    const msg = c.lastMessage?.content.toLowerCase() ?? ''
    const q = search.toLowerCase()
    return name.includes(q) || msg.includes(q) || c.contact.phone.includes(q)
  })

  // List status counts
  const counts = {
    all: conversations.length,
    OPEN: conversations.filter((c) => c.status === 'OPEN').length,
    HUMAN_HANDOFF: conversations.filter((c) => c.status === 'HUMAN_HANDOFF').length,
    CLOSED: conversations.filter((c) => c.status === 'CLOSED').length,
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '1.5rem',
        height: 'calc(100vh - 7rem)',
        alignItems: 'stretch',
      }}
    >
      {/* ── LEFT PANE: Conversations list ── */}
      <div
        className="card"
        style={{
          width: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: '100%',
          padding: '1.25rem',
          flexShrink: 0,
        }}
      >
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Chats</h2>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/conversations/export')
                if (!res.ok) throw new Error('Error al exportar')
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `conversaciones-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
              } catch (error) {
                console.error('Error al exportar:', error)
                alert('Error al exportar el CSV')
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.5rem' }}
            title="Exportar CSV"
          >
            <DownloadSimple size={14} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <MagnifyingGlass
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            style={{
              paddingLeft: '2.25rem',
              background: 'var(--color-bg-surface)',
              fontSize: '0.8rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            }}
            placeholder="Buscar por nombre, tel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          {[
            { id: 'all', label: 'Todas' },
            { id: 'OPEN', label: 'Abiertas' },
            { id: 'HUMAN_HANDOFF', label: 'Handoff' },
          ].map((tab) => {
            const isActive = filter === tab.id
            const count = counts[tab.id as keyof typeof counts] ?? 0
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #6172f3' : '2px solid transparent',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-brand-400)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: '0.625rem',
                    background: isActive ? 'rgba(97, 114, 243, 0.15)' : 'var(--color-bg-muted)',
                    color: isActive ? 'var(--color-brand-400)' : 'var(--color-text-muted)',
                    padding: '0.05rem 0.25rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* List items scrollbox */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginRight: '-0.5rem',
            paddingRight: '0.5rem',
          }}
        >
          {loadingList ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <div className="skeleton skeleton-circle" style={{ width: 32, height: 32 }} />
                <div style={{ flex: 1 }}>
                  <div
                    className="skeleton"
                    style={{ width: '50%', height: 10, marginBottom: '0.25rem' }}
                  />
                  <div className="skeleton" style={{ width: '80%', height: 8 }} />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.8rem',
              }}
            >
              No hay conversaciones.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const displayName = conv.contact.fullName ?? conv.contact.phone
              const initials = getInitials(displayName)
              const avatarBg = getAvatarBgColor(displayName)
              const isActive = selectedId === conv.id

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--color-bg-hover)' : 'transparent',
                    border: isActive
                      ? '1px solid rgba(97, 114, 243, 0.4)'
                      : '1px solid var(--color-border)',
                    borderLeft: conv.isHighPriority
                      ? '4px solid #ef4444'
                      : isActive
                        ? '1px solid rgba(97, 114, 243, 0.4)'
                        : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: avatarBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {displayName}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.25rem',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {conv.lastMessage?.sender === 'BOT' && (
                          <Robot
                            size={11}
                            color="var(--color-brand-400)"
                            style={{ marginRight: 2 }}
                          />
                        )}
                        {conv.lastMessage?.sender === 'HUMAN' && (
                          <User
                            size={11}
                            color="var(--color-whatsapp)"
                            style={{ marginRight: 2 }}
                          />
                        )}
                        {conv.lastMessage?.content ?? 'Sin mensajes'}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.25rem',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <SentimentBadge
                          sentiment={conv.sentiment}
                          isHighPriority={conv.isHighPriority}
                        />
                        <StatusBadge status={conv.status} botActive={conv.botActive} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── CENTER PANE: Chat window ── */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '1.25rem',
          position: 'relative',
        }}
      >
        {selectedId ? (
          loadingDetail && !detail ? (
            <div
              style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <CircleNotch size={32} className="spinner" />
            </div>
          ) : detail ? (
            <>
              {/* Active chat header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '0.75rem',
                  marginBottom: '1rem',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6172f3, #25d366)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={18} color="#fff" weight="fill" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                      {detail.contact.fullName ?? detail.contact.phone}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {detail.contact.phone}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Bot Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Bot {detail.botActive ? 'activo' : 'inactivo'}
                    </span>
                    <button
                      onClick={handleToggleBot}
                      disabled={togglingBot}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      {togglingBot ? (
                        <CircleNotch size={18} className="spinner" />
                      ) : detail.botActive ? (
                        <ToggleRight size={24} color="#25d366" weight="fill" />
                      ) : (
                        <ToggleLeft size={24} color="var(--color-text-muted)" weight="fill" />
                      )}
                    </button>
                  </div>

                  {/* Warning Handoff Badge */}
                  {detail.status === 'HUMAN_HANDOFF' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#f59e0b',
                        fontWeight: 600,
                      }}
                    >
                      <Warning size={14} /> Handoff
                    </span>
                  )}
                </div>
              </div>

              {/* Chat history scrollbox */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingRight: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {detail.messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '4rem',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Sin mensajes en este chat.
                  </div>
                ) : (
                  detail.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Controls */}
              {!detail.botActive ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {/* Selector: Mensaje o Nota Interna */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.25rem',
                      marginBottom: '0.375rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsInternalMode(false)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        border: 'none',
                        background: !isInternalMode ? 'rgba(37, 211, 102, 0.12)' : 'transparent',
                        color: !isInternalMode ? '#25d366' : 'var(--color-text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderBottom: !isInternalMode ? '2px solid #25d366' : 'none',
                      }}
                    >
                      💬 Mensaje
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalMode(true)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        border: 'none',
                        background: isInternalMode ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                        color: isInternalMode ? '#f59e0b' : 'var(--color-text-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderBottom: isInternalMode ? '2px solid #f59e0b' : 'none',
                      }}
                    >
                      🔒 Nota Interna
                    </button>
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}
                  >
                    <input
                      type="text"
                      className="input"
                      style={{
                        flex: 1,
                        fontSize: '0.85rem',
                        backgroundColor: isInternalMode ? 'rgba(245, 158, 11, 0.04)' : undefined,
                        borderColor: isInternalMode ? 'rgba(245, 158, 11, 0.35)' : undefined,
                      }}
                      placeholder={
                        isInternalMode
                          ? 'Escribe una nota interna para el equipo...'
                          : 'Responde directamente al cliente en WhatsApp...'
                      }
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sending}
                    />

                    {/* Copilot Suggested Response */}
                    <button
                      type="button"
                      onClick={handleRequestSuggestion}
                      disabled={suggesting || sending || isInternalMode}
                      className="btn btn-secondary has-tooltip"
                      style={{
                        flexShrink: 0,
                        padding: '0.5rem',
                        background:
                          'linear-gradient(135deg, rgba(97, 114, 243, 0.08) 0%, rgba(37, 211, 102, 0.08) 100%)',
                        border: '1px solid rgba(97, 114, 243, 0.25)',
                        color: 'var(--color-brand-300)',
                        opacity: isInternalMode ? 0.4 : 1,
                      }}
                    >
                      {suggesting ? (
                        <CircleNotch size={16} className="spinner" />
                      ) : (
                        <Sparkle size={16} weight="fill" />
                      )}
                      <span className="tooltip">Sugerir con IA</span>
                    </button>

                    {/* WhatsApp Template Sender Dropdown Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowTemplates(!showTemplates)}
                      disabled={sending || isInternalMode}
                      className="btn btn-secondary has-tooltip"
                      style={{
                        flexShrink: 0,
                        padding: '0.5rem',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        opacity: isInternalMode ? 0.4 : 1,
                      }}
                    >
                      <Megaphone size={16} />
                      <span className="tooltip">Enviar Plantilla</span>
                    </button>

                    {/* Template Selection Floating Dropdown Menu */}
                    {showTemplates && (
                      <div
                        className="glass animate-fade-in"
                        style={{
                          position: 'absolute',
                          bottom: '110%',
                          right: '60px',
                          width: 250,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          boxShadow: 'var(--shadow-elevated)',
                          padding: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          zIndex: 50,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.5rem',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          PLANTILLAS META APROBADAS
                        </div>
                        {APPROVED_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => void handleSendTemplate(tpl)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-text-primary)',
                              fontSize: '0.75rem',
                              textAlign: 'left',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              width: '100%',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor = 'transparent')
                            }
                          >
                            <div style={{ fontWeight: 600 }}>{tpl.label}</div>
                            <div
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--color-text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tpl.text}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn"
                      disabled={sending || !messageInput.trim()}
                      style={{
                        flexShrink: 0,
                        backgroundColor: isInternalMode ? '#f59e0b' : '#25d366',
                        color: '#fff',
                      }}
                    >
                      {sending ? (
                        <CircleNotch size={16} className="spinner" />
                      ) : (
                        <PaperPlaneTilt size={16} weight="fill" />
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(97, 114, 243, 0.08)',
                    border: '1px solid rgba(97, 114, 243, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <Robot size={16} color="#8098f9" />
                  <span>
                    El agente IA está respondiendo automáticamente. Desactívalo para interactuar de
                    forma manual.
                  </span>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              No se pudo cargar la conversación.
            </div>
          )
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              gap: '1rem',
            }}
          >
            <ChatTeardropDots size={60} style={{ opacity: 0.15 }} />
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                Bandeja de Entrada
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', maxWidth: 280 }}>
                Selecciona una conversación de la lista de la izquierda para comenzar a chatear.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANE: CRM Details Card ── */}
      {detail && (
        <div
          className="card"
          style={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%',
            overflowY: 'auto',
            padding: '1.25rem',
          }}
        >
          {/* Summary header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6172f3 0%, #25d366 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              {detail.contact.fullName
                ? detail.contact.fullName.charAt(0).toUpperCase()
                : detail.contact.phone.replace(/[^0-9]/g, '').slice(-2)}
            </div>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                {detail.contact.fullName ?? 'Cliente de WhatsApp'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                {detail.contact.phone}
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {/* Assigned Agent Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              AGENTE ASIGNADO
            </label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <select
                value={detail.contact.metadata?.assignedToId ?? ''}
                onChange={(e) => void handleAssignAgent(e.target.value)}
                disabled={assigning}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  Sin Asignar
                </option>
                {agents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                    style={{ backgroundColor: 'var(--color-bg-card)' }}
                  >
                    {agent.name} ({agent.role === 'ADMIN' ? 'Admin' : 'Agente'})
                  </option>
                ))}
              </select>
              {assigning && <CircleNotch size={14} className="spinner" style={{ flexShrink: 0 }} />}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {/* AI Extracted CRM Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              DATOS EXTRAÍDOS POR IA
            </span>

            {/* Email */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Envelope size={15} color="#6172f3" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  CORREO ELECTRÓNICO
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: detail.contact.metadata?.email
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {detail.contact.metadata?.email ?? 'No especificado'}
                </span>
              </div>
            </div>

            {/* Birthdate */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CalendarBlank size={15} color="#25d366" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  FECHA NACIMIENTO
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: detail.contact.metadata?.birthdate
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {detail.contact.metadata?.birthdate ?? 'No especificada'}
                </span>
              </div>
            </div>

            {/* Reason */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Stethoscope size={15} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  MOTIVO DE CONSULTA
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: detail.contact.metadata?.reason
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {detail.contact.metadata?.reason ?? 'No detectado aún'}
                </span>
              </div>
            </div>

            {/* Allergies */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Warning size={15} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  ALERGIAS / RECOMENDACIONES
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: detail.contact.metadata?.allergies
                      ? '#ef4444'
                      : 'var(--color-text-muted)',
                    fontWeight: detail.contact.metadata?.allergies ? 600 : 400,
                  }}
                >
                  {detail.contact.metadata?.allergies ?? 'Ninguna registrada'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Note size={15} color="#8098f9" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    fontWeight: 600,
                  }}
                >
                  NOTAS ADICIONALES
                </span>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: detail.contact.metadata?.notes
                      ? 'var(--color-text-secondary)'
                      : 'var(--color-text-muted)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {detail.contact.metadata?.notes ?? 'Sin observaciones'}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(97, 114, 243, 0.05)',
              border: '1px dashed rgba(97, 114, 243, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              textAlign: 'center',
              fontSize: '0.65rem',
              color: 'var(--color-brand-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
            }}
          >
            <Sparkle size={12} weight="fill" color="#8098f9" />
            <span>Ficha de IA</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConversacionesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <CircleNotch size={32} className="spinner" />
        </div>
      }
    >
      <InboxComponent />
    </Suspense>
  )
}
