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
  Sparkle,
  Envelope,
  CalendarBlank,
  Stethoscope,
  Note,
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
  metadata?: {
    email?: string | null
    birthdate?: string | null
    reason?: string | null
    allergies?: string | null
    notes?: string | null
  } | null
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
  const [suggesting, setSuggesting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  async function requestSuggestion() {
    if (suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch(`/api/conversations/${id}/suggest`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = (await res.json()) as { suggestion: string }
        if (data.suggestion) {
          setMessage(data.suggestion)
        }
      }
    } catch (e) {
      console.error('Error fetching suggestion:', e)
    } finally {
      setSuggesting(false)
    }
  }

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
        gap: '1.5rem',
        height: 'calc(100vh - 4rem)',
        maxHeight: 'calc(100vh - 4rem)',
        alignItems: 'stretch',
      }}
    >
      {/* Columna Izquierda: Chat */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          minWidth: 0,
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
              type="button"
              onClick={requestSuggestion}
              disabled={suggesting || sending}
              className="btn btn-secondary has-tooltip"
              style={{
                flexShrink: 0,
                background:
                  'linear-gradient(135deg, rgba(97, 114, 243, 0.1) 0%, rgba(37, 211, 102, 0.1) 100%)',
                border: '1px solid rgba(97, 114, 243, 0.3)',
                color: 'var(--color-brand-300)',
              }}
            >
              {suggesting ? (
                <CircleNotch size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Sparkle size={18} weight="fill" />
              )}
              <span className="tooltip">Sugerir Respuesta</span>
            </button>
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

      {/* Columna Derecha: Ficha del Cliente (CRM) */}
      <div
        className="card"
        style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6172f3 0%, #25d366 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#fff',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {conversation.contact.fullName
              ? conversation.contact.fullName.charAt(0).toUpperCase()
              : conversation.contact.phone.replace(/[^0-9]/g, '').slice(-2)}
          </div>
          <div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-text-primary)',
              }}
            >
              {conversation.contact.fullName ?? 'Cliente de WhatsApp'}
            </h3>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                margin: '0.25rem 0 0 0',
              }}
            >
              {conversation.contact.phone}
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', flex: 1 }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.05em',
            }}
          >
            DATOS EXTRAÍDOS POR IA
          </span>

          {/* Email */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Envelope size={18} color="#6172f3" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                CORREO ELECTRÓNICO
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: conversation.contact.metadata?.email
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                }}
              >
                {conversation.contact.metadata?.email ?? 'No especificado'}
              </span>
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <CalendarBlank size={18} color="#25d366" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                FECHA DE NACIMIENTO / EDAD
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: conversation.contact.metadata?.birthdate
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                }}
              >
                {conversation.contact.metadata?.birthdate ?? 'No especificada'}
              </span>
            </div>
          </div>

          {/* Motivo de Consulta */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Stethoscope size={18} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                MOTIVO DE CONSULTA
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: conversation.contact.metadata?.reason
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                  fontStyle: conversation.contact.metadata?.reason ? 'normal' : 'italic',
                }}
              >
                {conversation.contact.metadata?.reason ?? 'No detectado aún'}
              </span>
            </div>
          </div>

          {/* Alergias / Antecedentes */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Warning size={18} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                ALERGIAS / RECOMENDACIONES
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: conversation.contact.metadata?.allergies
                    ? '#ef4444'
                    : 'var(--color-text-muted)',
                  fontWeight: conversation.contact.metadata?.allergies ? 600 : 400,
                }}
              >
                {conversation.contact.metadata?.allergies ?? 'Ninguna registrada'}
              </span>
            </div>
          </div>

          {/* Notas Generales */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Note size={18} color="#8098f9" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                NOTAS ADICIONALES
              </span>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: conversation.contact.metadata?.notes
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {conversation.contact.metadata?.notes ?? 'Sin observaciones'}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(97, 114, 243, 0.06)',
            border: '1px dashed rgba(97, 114, 243, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            textAlign: 'center',
            fontSize: '0.725rem',
            color: 'var(--color-brand-300)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
          }}
        >
          <Sparkle size={14} weight="fill" color="#8098f9" />
          <span>Ficha actualizada por IA</span>
        </div>
      </div>
    </div>
  )
}
