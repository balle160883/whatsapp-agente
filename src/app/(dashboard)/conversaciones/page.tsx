'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ChatTeardropDots,
  MagnifyingGlass,
  Robot,
  User,
  DownloadSimple,
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

export default function ConversacionesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const fetchConversations = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/conversations${params}`)
      const data = (await res.json()) as { conversations: Conversation[] }
      setConversations(data.conversations ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchConversations()
    const interval = setInterval(fetchConversations, 12000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const filtered = conversations.filter((c) => {
    const name = c.contact.fullName?.toLowerCase() ?? c.contact.phone
    const msg = c.lastMessage?.content.toLowerCase() ?? ''
    const q = search.toLowerCase()
    return name.includes(q) || msg.includes(q) || c.contact.phone.includes(q)
  })

  // Contadores para las pestañas
  const counts = {
    all: conversations.length,
    OPEN: conversations.filter((c) => c.status === 'OPEN').length,
    HUMAN_HANDOFF: conversations.filter((c) => c.status === 'HUMAN_HANDOFF').length,
    CLOSED: conversations.filter((c) => c.status === 'CLOSED').length,
  }

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Conversaciones</h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginTop: '0.25rem',
              fontSize: '0.875rem',
            }}
          >
            Gestiona la atención al cliente y las transferencias del bot
          </p>
        </div>
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
          className="btn btn-secondary"
        >
          <DownloadSimple size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Controles de Búsqueda y Pestañas */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        {/* Barra de Búsqueda */}
        <div style={{ position: 'relative', width: '100%' }}>
          <MagnifyingGlass
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            id="conv-search"
            type="text"
            className="input"
            style={{ paddingLeft: '2.5rem', background: 'var(--color-bg-surface)' }}
            placeholder="Buscar por nombre, número de teléfono o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tab Layout de Filtro */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            gap: '1rem',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'all', label: 'Todas' },
            { id: 'OPEN', label: 'Abiertas' },
            { id: 'HUMAN_HANDOFF', label: 'Handoffs' },
            { id: 'CLOSED', label: 'Cerradas' },
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
                  borderBottom: isActive
                    ? '2px fill var(--color-brand-500)'
                    : '2px solid transparent',
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-brand-400)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  position: 'relative',
                  top: '1px',
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: isActive ? 'rgba(97, 114, 243, 0.15)' : 'var(--color-bg-muted)',
                    color: isActive ? 'var(--color-brand-400)' : 'var(--color-text-muted)',
                    padding: '0.125rem 0.375rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Conversaciones */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card"
              style={{ height: 80, display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ width: '25%', height: 16, marginBottom: '0.5rem' }}
                />
                <div className="skeleton" style={{ width: '60%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            color: 'var(--color-text-muted)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <ChatTeardropDots size={48} style={{ marginBottom: '1rem', opacity: 0.25 }} />
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>
            No hay conversaciones {search ? 'que coincidan con tu búsqueda' : 'aún'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((conv) => {
            const displayName = conv.contact.fullName ?? conv.contact.phone
            const avatarBg = getAvatarBgColor(displayName)
            const initials = getInitials(displayName)

            return (
              <Link
                key={conv.id}
                href={`/conversaciones/${conv.id}`}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  borderLeft: conv.isHighPriority
                    ? '4px solid #ef4444'
                    : '1px solid var(--color-border)',
                  textDecoration: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(97,114,243,0.35)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = conv.isHighPriority
                    ? '#ef4444'
                    : 'var(--color-border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-card)'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateX(0)'
                }}
              >
                {/* Avatar Inteligente */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {displayName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        flexShrink: 0,
                        marginLeft: '0.5rem',
                      }}
                    >
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.375rem',
                      gap: '1rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {conv.lastMessage?.sender === 'BOT' && (
                        <Robot size={13} color="var(--color-brand-400)" />
                      )}
                      {conv.lastMessage?.sender === 'HUMAN' && (
                        <User size={13} color="var(--color-whatsapp)" />
                      )}
                      {conv.lastMessage?.content ?? 'Sin mensajes'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <SentimentBadge
                        sentiment={conv.sentiment}
                        isHighPriority={conv.isHighPriority}
                      />
                      <StatusBadge status={conv.status} botActive={conv.botActive} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
