'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ChatTeardropDots,
  MagnifyingGlass,
  Robot,
  User,
  FunnelSimple,
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
    return <span className="badge badge-danger">⚠️ Alta Prioridad</span>
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
  if (status === 'HUMAN_HANDOFF') return <span className="badge badge-warning">Transferido</span>
  if (status === 'CLOSED') return <span className="badge badge-muted">Cerrado</span>
  if (!botActive) return <span className="badge badge-warning">Manual</span>
  return <span className="badge badge-success">Bot activo</span>
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
    const interval = setInterval(fetchConversations, 15000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const filtered = conversations.filter((c) => {
    const name = c.contact.fullName?.toLowerCase() ?? c.contact.phone
    const msg = c.lastMessage?.content.toLowerCase() ?? ''
    const q = search.toLowerCase()
    return name.includes(q) || msg.includes(q) || c.contact.phone.includes(q)
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Conversaciones</h1>
          <p
            style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}
          >
            {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''} activa
            {conversations.length !== 1 ? 's' : ''}
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

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
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
            id="conv-search"
            type="text"
            className="input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar por nombre, teléfono o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <FunnelSimple
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <select
            id="conv-filter"
            className="input"
            style={{ paddingLeft: '2.25rem', width: 'auto', cursor: 'pointer' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="OPEN">Abiertas</option>
            <option value="HUMAN_HANDOFF">Transferidas</option>
            <option value="CLOSED">Cerradas</option>
          </select>
        </div>
      </div>

      {/* Conversation List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <ChatTeardropDots size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p>No hay conversaciones {search ? 'que coincidan con tu búsqueda' : 'aún'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map((conv) => (
            <Link
              key={conv.id}
              href={`/conversaciones/${conv.id}`}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(97,114,243,0.4)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-elevated)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)'
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6172f3, #a4bbfc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={20} color="#fff" weight="fill" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {conv.contact.fullName ?? conv.contact.phone}
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
                    marginTop: '0.25rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {conv.lastMessage?.sender === 'BOT' && (
                      <Robot size={12} style={{ marginRight: 4 }} />
                    )}
                    {conv.lastMessage?.content ?? 'Sin mensajes'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <SentimentBadge
                      sentiment={conv.sentiment}
                      isHighPriority={conv.isHighPriority}
                    />
                    <StatusBadge status={conv.status} botActive={conv.botActive} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
