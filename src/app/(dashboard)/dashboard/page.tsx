'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChatTeardropDots,
  CalendarCheck,
  TrendUp,
  Robot,
  ArrowRight,
  WhatsappLogo,
  Clock,
  User,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  totalConversations: number
  appointmentsThisWeek: number
  recentConversations: Array<{
    id: string
    status: string
    botActive: boolean
    contact: { fullName: string | null; phone: string }
    lastMessage: { content: string; createdAt: string; sender: string } | null
    lastMessageAt: string | null
  }>
  trend: Array<{ date: string; count: number }>
}

function TrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _width = 100 / data.length

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: '3px' }}>
      {data.map((d, i) => {
        const height = Math.max((d.count / max) * 80, 4)
        const isLast = i === data.length - 1
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} mensajes`}
            style={{
              flex: 1,
              height,
              background: isLast
                ? 'linear-gradient(180deg, #6172f3, #4a56e8)'
                : 'rgba(97, 114, 243, 0.25)',
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s ease',
              cursor: 'default',
            }}
          />
        )
      })}
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {title}
          </div>
          <div
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              marginTop: '0.5rem',
            }}
          >
            {value}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.25rem',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '0.75rem',
            background: `${color}20`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={color} weight="duotone" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = (await res.json()) as DashboardStats
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const senderLabel = (sender: string) => {
    if (sender === 'CLIENT') return 'Cliente'
    if (sender === 'BOT') return 'Bot'
    return 'Agente'
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Resumen de tu plataforma de atención al cliente
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <KpiCard
              title="Conversaciones (30 días)"
              value={stats?.totalConversations ?? 0}
              icon={ChatTeardropDots}
              color="#6172f3"
              subtitle="Mensajes entrantes"
            />
            <KpiCard
              title="Citas esta semana"
              value={stats?.appointmentsThisWeek ?? 0}
              icon={CalendarCheck}
              color="#25d366"
              subtitle="Agendadas con IA"
            />
            <KpiCard
              title="Bot activo"
              value="Operativo"
              icon={Robot}
              color="#f59e0b"
              subtitle="Respondiendo 24/7"
            />
          </div>

          {/* Trend & Recent Conversations */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.6fr',
              gap: '1.25rem',
            }}
          >
            {/* Trend Chart */}
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <TrendUp size={18} color="#6172f3" weight="duotone" />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Mensajes diarios</span>
                <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                  14 días
                </span>
              </div>
              {stats?.trend && stats.trend.length > 0 ? (
                <>
                  <TrendChart data={stats.trend} />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {stats.trend[0]?.date}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Hoy
                    </span>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  Sin datos aún
                </div>
              )}
            </div>

            {/* Recent Conversations */}
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <WhatsappLogo size={18} color="#25d366" weight="duotone" />
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    Conversaciones recientes
                  </span>
                </div>
                <Link
                  href="/conversaciones"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Ver todas <ArrowRight size={12} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.recentConversations?.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    No hay conversaciones aún
                  </div>
                )}
                {stats?.recentConversations?.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversaciones/${conv.id}`}
                    style={{
                      display: 'flex',
                      gap: '0.875rem',
                      padding: '0.875rem',
                      background: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(97,114,243,0.4)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')
                    }
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6172f3, #25d366)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <User size={16} color="#fff" weight="fill" />
                    </div>

                    {/* Content */}
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
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {conv.contact.fullName ?? conv.contact.phone}
                        </span>
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <span
                            className={`badge ${conv.botActive ? 'badge-success' : 'badge-warning'}`}
                            style={{ fontSize: '0.625rem', padding: '0.125rem 0.4rem' }}
                          >
                            {conv.botActive ? 'Bot' : 'Humano'}
                          </span>
                          {conv.lastMessageAt && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              <Clock size={10} style={{ marginRight: 2 }} />
                              {format(parseISO(conv.lastMessageAt), 'HH:mm', { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          marginTop: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.lastMessage
                          ? `${senderLabel(conv.lastMessage.sender)}: ${conv.lastMessage.content}`
                          : 'Sin mensajes'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
