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
  Lightning,
  Sparkle,
  Megaphone,
  ChartBar,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  totalConversations: number
  appointmentsThisWeek: number
  pendingHandoffs: number
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

function PremiumTrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data.map((d) => d.count), 1)
  const height = 140
  const width = 500
  const padding = 20

  // Calcular puntos para el SVG
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1)
    const y = height - padding - (d.count / max) * (height - padding * 2)
    return { x, y, ...d }
  })

  // Generar cadena del path para la línea
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    // Curva suavizada bezier simple
    const prev = points[i - 1]
    const cpX1 = prev.x + (p.x - prev.x) / 2
    const cpY1 = prev.y
    const cpX2 = prev.x + (p.x - prev.x) / 2
    const cpY2 = p.y
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`
  }, '')

  // Generar cadena para el área debajo de la línea
  const firstP = points[0]
  const lastP = points[points.length - 1]
  const areaD = `${pathD} L ${lastP.x} ${height - padding} L ${firstP.x} ${height - padding} Z`

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6172f3" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6172f3" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6172f3" />
            <stop offset="100%" stopColor="#25d366" />
          </linearGradient>
        </defs>

        {/* Líneas de cuadrícula horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + ratio * (height - padding * 2)
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          )
        })}

        {/* Área rellena con degradado */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Línea principal */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Puntos interactivos */}
        {points.map((p, i) => (
          <g key={i} className="has-tooltip">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--color-bg-surface)"
              stroke="#6172f3"
              strokeWidth="2"
              style={{ transition: 'r 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.setAttribute('r', '7')}
              onMouseLeave={(e) => e.currentTarget.setAttribute('r', '4')}
            />
            {/* Tooltip personalizado */}
            <title>{`${p.date}: ${p.count} mensajes`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  badge,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  color: string
  subtitle?: string
  badge?: { text: string; type: 'success' | 'warning' | 'danger' | 'info' }
}) {
  const getBadgeClass = (type: string) => {
    if (type === 'danger') return 'badge-danger'
    if (type === 'warning') return 'badge-warning'
    if (type === 'success') return 'badge-success'
    return 'badge-info'
  }

  return (
    <div
      className="kpi-card"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span
            style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
              marginTop: '0.5rem',
            }}
          >
            {value}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {subtitle && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {subtitle}
              </span>
            )}
            {badge && (
              <span
                className={`badge ${getBadgeClass(badge.type)}`}
                style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}
              >
                {badge.text}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '0.75rem',
            background: `${color}15`,
            border: `1px solid ${color}25`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} color={color} weight="duotone" />
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div>
      {/* Header Skeleton */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="skeleton" style={{ width: 220, height: 32, marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: 340, height: 16 }} />
      </div>

      {/* KPI Grid Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card"
            style={{
              height: 110,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              className="skeleton"
              style={{ width: '60%', height: 14, marginBottom: '0.75rem' }}
            />
            <div className="skeleton" style={{ width: '40%', height: 28 }} />
          </div>
        ))}
      </div>

      {/* Layout Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>
        <div className="card" style={{ height: 320 }}>
          <div className="skeleton" style={{ width: '40%', height: 20, marginBottom: '1.5rem' }} />
          <div className="skeleton" style={{ width: '100%', height: 160, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '80%', height: 14 }} />
        </div>
        <div className="card" style={{ height: 320 }}>
          <div className="skeleton" style={{ width: '50%', height: 20, marginBottom: '1.5rem' }} />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}
            >
              <div className="skeleton skeleton-circle" style={{ width: 36, height: 36 }} />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ width: '30%', height: 14, marginBottom: '0.5rem' }}
                />
                <div className="skeleton" style={{ width: '70%', height: 12 }} />
              </div>
            </div>
          ))}
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
    const interval = setInterval(fetchStats, 20000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const senderLabel = (sender: string) => {
    if (sender === 'CLIENT') return 'Cliente'
    if (sender === 'BOT') return 'Bot'
    return 'Agente'
  }

  if (loading) return <DashboardSkeleton />

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header / Bienvenida */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(97, 114, 243, 0.1) 0%, rgba(37, 211, 102, 0.05) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>¡{getGreeting()}!</h1>
            <Sparkle
              size={20}
              color="#f59e0b"
              weight="fill"
              style={{ animation: 'bounce 2s infinite' }}
            />
          </div>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginTop: '0.25rem',
              fontSize: '0.875rem',
            }}
          >
            Tu agente inteligente está operativo. Aquí tienes un resumen de la actividad reciente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/conversaciones" className="btn btn-whatsapp">
            <ChatTeardropDots size={16} weight="fill" />
            Atender chats
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <KpiCard
          title="Mensajes Recibidos"
          value={stats?.totalConversations ?? 0}
          icon={ChatTeardropDots}
          color="#6172f3"
          subtitle="Últimos 30 días"
          badge={{ text: 'Activo', type: 'info' }}
        />
        <KpiCard
          title="Citas Agendadas"
          value={stats?.appointmentsThisWeek ?? 0}
          icon={CalendarCheck}
          color="#25d366"
          subtitle="Esta semana"
          badge={{ text: 'Sincronizado', type: 'success' }}
        />
        <KpiCard
          title="Handoffs Pendientes"
          value={stats?.pendingHandoffs ?? 0}
          icon={User}
          color="#ef4444"
          subtitle="Espera de humano"
          badge={
            stats?.pendingHandoffs && stats.pendingHandoffs > 0
              ? { text: '¡Atención!', type: 'danger' }
              : undefined
          }
        />
        <KpiCard
          title="Estado del Agente"
          value="Operando"
          icon={Robot}
          color="#f59e0b"
          subtitle="Respuesta 24/7"
          badge={{ text: 'Online', type: 'success' }}
        />
      </div>

      {/* Layout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.8fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Lado izquierdo: Tráfico y Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Trend Chart */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <TrendUp size={18} color="#6172f3" weight="duotone" />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Tráfico de Mensajes</span>
              <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                14 días
              </span>
            </div>
            {stats?.trend && stats.trend.length > 0 ? (
              <>
                <PremiumTrendChart data={stats.trend} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {stats.trend[0]?.date}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Hoy</span>
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
                Sin datos de tendencia
              </div>
            )}
          </div>

          {/* Acciones Rápidas */}
          <div className="card" style={{ background: 'var(--color-bg-card)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              <Lightning size={18} color="#f59e0b" weight="fill" />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Acciones Rápidas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <Link
                href="/campanas"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
              >
                <Megaphone size={16} /> Crear Campaña de WhatsApp
              </Link>
              <Link
                href="/analytics"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
              >
                <ChartBar size={16} /> Ver Reportes Avanzados
              </Link>
            </div>
          </div>
        </div>

        {/* Lado derecho: Conversaciones Recientes */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <WhatsappLogo size={18} color="#25d366" weight="duotone" />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                Últimos Chats Recibidos
              </span>
            </div>
            <Link
              href="/conversaciones"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', gap: '0.25rem' }}
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats?.recentConversations?.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No hay conversaciones registradas
              </div>
            ) : (
              stats?.recentConversations?.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/conversaciones/${conv.id}`}
                  style={{
                    display: 'flex',
                    gap: '0.875rem',
                    padding: '0.875rem 1rem',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(97,114,243,0.35)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--color-bg-elevated)'
                  }}
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
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {conv.contact.fullName ?? conv.contact.phone}
                      </span>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <span
                          className={`badge ${
                            conv.status === 'HUMAN_HANDOFF'
                              ? 'badge-danger'
                              : conv.botActive
                                ? 'badge-success'
                                : 'badge-warning'
                          }`}
                          style={{ fontSize: '0.625rem', padding: '0.125rem 0.4rem' }}
                        >
                          {conv.status === 'HUMAN_HANDOFF'
                            ? 'Handoff'
                            : conv.botActive
                              ? 'Bot'
                              : 'Manual'}
                        </span>
                        {conv.lastMessageAt && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Clock size={10} />
                            {format(parseISO(conv.lastMessageAt), 'HH:mm', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
