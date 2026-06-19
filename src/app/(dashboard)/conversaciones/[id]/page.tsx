'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Robot,
  User,
  PaperPlaneTilt,
  ToggleLeft,
  ToggleRight,
  Phone,
  CircleNotch,
  Warning,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Message {
  id: string
  content: string
  sender: 'CLIENT' | 'BOT' | 'HUMAN'
  direction: 'INCOMING' | 'OUTGOING'
  createdAt: string
}

interface Contact {
  fullName: string | null
  phone: string
  isNewPatient: boolean
}

interface ConversationDetail {
  id: string
  status: string
  botActive: boolean
  contact: Contact
  messages: Message[]
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOutgoing = msg.direction === 'OUTGOING'
  const bubbleClass =
    msg.sender === 'CLIENT'
      ? 'chat-bubble chat-bubble-client'
      : msg.sender === 'BOT'
        ? 'chat-bubble chat-bubble-bot'
        : 'chat-bubble chat-bubble-human'

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
      {/* Sender label */}
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
        {msg.sender === 'BOT' && <Robot size={10} />}
        {msg.sender === 'HUMAN' && <User size={10} />}
        {msg.sender === 'CLIENT' ? 'Cliente' : msg.sender === 'BOT' ? 'Bot IA' : 'Agente'}
      </div>

      <div className={bubbleClass}>
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

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [togglingBot, setTogglingBot] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (!res.ok) {
        router.push('/conversaciones')
        return
      }
      const data = (await res.json()) as ConversationDetail
      setConversation(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchConversation()
    const interval = setInterval(fetchConversation, 5000)
    return () => clearInterval(interval)
  }, [fetchConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages.length])

  async function toggleBot() {
    if (!conversation) return
    setTogglingBot(true)
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: !conversation.botActive }),
      })
      if (res.ok) {
        setConversation((prev) => (prev ? { ...prev, botActive: !prev.botActive } : prev))
      }
    } finally {
      setTogglingBot(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    const text = message
    setMessage('')

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (res.ok) {
        const newMsg = (await res.json()) as Message
        setConversation((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev))
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!conversation) return null

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        maxHeight: 'calc(100vh - 4rem)',
      }}
    >
      {/* Header */}
      <div
        className="card"
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexShrink: 0,
        }}
      >
        <Link
          href="/conversaciones"
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.375rem' }}
        >
          <ArrowLeft size={18} />
        </Link>

        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6172f3, #25d366)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={18} color="#fff" weight="fill" />
        </div>

        {/* Contact Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            {conversation.contact.fullName ?? conversation.contact.phone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={12} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {conversation.contact.phone}
            </span>
            {conversation.contact.isNewPatient && (
              <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>
                Nuevo
              </span>
            )}
          </div>
        </div>

        {/* Bot Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Bot {conversation.botActive ? 'activo' : 'inactivo'}
          </span>
          <button
            id="toggle-bot"
            onClick={toggleBot}
            disabled={togglingBot}
            className="btn btn-ghost"
            style={{ padding: '0.375rem 0.5rem' }}
          >
            {togglingBot ? (
              <CircleNotch size={22} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : conversation.botActive ? (
              <ToggleRight size={28} color="#25d366" weight="fill" />
            ) : (
              <ToggleLeft size={28} color="var(--color-text-muted)" weight="fill" />
            )}
          </button>
        </div>

        {/* Status Badge */}
        {conversation.status === 'HUMAN_HANDOFF' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: '#f59e0b',
              fontSize: '0.8125rem',
            }}
          >
            <Warning size={16} />
            Requiere atención
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 0.25rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {conversation.messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
            }}
          >
            Sin mensajes aún. El cliente iniciará la conversación.
          </div>
        ) : (
          conversation.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {!conversation.botActive && (
        <form
          onSubmit={sendMessage}
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.75rem',
            flexShrink: 0,
          }}
        >
          <input
            id="manual-message-input"
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="Escribe un mensaje como agente humano..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
          <button
            id="send-message-btn"
            type="submit"
            className="btn btn-whatsapp"
            disabled={sending || !message.trim()}
            style={{ flexShrink: 0 }}
          >
            {sending ? (
              <CircleNotch size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <PaperPlaneTilt size={18} weight="fill" />
            )}
            Enviar
          </button>
        </form>
      )}

      {conversation.botActive && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'rgba(97, 114, 243, 0.08)',
            border: '1px solid rgba(97, 114, 243, 0.2)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          <Robot size={16} color="#8098f9" />
          El bot está respondiendo automáticamente. Desactívalo para enviar mensajes manuales.
        </div>
      )}
    </div>
  )
}
