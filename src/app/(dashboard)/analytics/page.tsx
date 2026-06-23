'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendUp,
  Smiley,
  Star,
  Robot,
  Clock,
  Sparkle,
  ArrowClockwise,
  Chats,
  WarningCircle,
} from '@phosphor-icons/react'

interface AnalyticsData {
  messages: {
    total: number
    incoming: number
    outgoing: number
    peakHours: Array<{ hour: number; count: number }>
    dailyTrend: Array<{ date: string; incoming: number; outgoing: number; total: number }>
  }
  appointments: {
    conversionRate: number
    totalConversations: number
    convertedConversations: number
    totalAppointments: number
    statusCounts: Record<string, number>
  }
  nps: {
    scoreAverage: number
    npsScore: number
    categoryCounts: {
      PROMOTER: number
      PASSIVE: number
      DETRACTOR: number
    }
    scoreDistribution: Record<number, number>
    totalFeedbacks: number
  }
  handoff: {
    handoffRate: number
    totalConversations: number
    handoffConversations: number
    reasons: Array<{ reason: string; count: number }>
  }
  sentiment: {
    distribution: {
      POSITIVE: number
      NEUTRAL: number
      NEGATIVE: number
    }
    total: number
  }
}

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/analytics?timeframe=${timeframe}`)
      if (!res.ok) {
        throw new Error('Error al cargar las métricas')
      }
      const json = (await res.json()) as AnalyticsData
      setData(json)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAnalytics()
  }, [fetchAnalytics])

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: '250px', height: '40px' }} />
          <div className="skeleton" style={{ width: '320px', height: '40px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: 110 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '1.25rem' }}>
          <div className="card" style={{ height: 320 }} />
          <div className="card" style={{ height: 320 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '4rem',
          textAlign: 'center',
        }}
      >
        <WarningCircle size={48} color="var(--color-danger)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Error al cargar analíticas</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400 }}>
          Ocurrió un problema de conexión al recopilar las estadísticas. Por favor intenta
          nuevamente.
        </p>
        <button onClick={() => void fetchAnalytics()} className="btn btn-secondary">
          <ArrowClockwise size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // Safe defaults
  const messages = data?.messages || {
    total: 0,
    incoming: 0,
    outgoing: 0,
    peakHours: [],
    dailyTrend: [],
  }
  const appointments = data?.appointments || {
    conversionRate: 0,
    totalConversations: 0,
    convertedConversations: 0,
    totalAppointments: 0,
    statusCounts: {},
  }
  const nps = data?.nps || {
    scoreAverage: 0,
    npsScore: 0,
    categoryCounts: { PROMOTER: 0, PASSIVE: 0, DETRACTOR: 0 },
    scoreDistribution: {},
    totalFeedbacks: 0,
  }
  const handoff = data?.handoff || {
    handoffRate: 0,
    totalConversations: 0,
    handoffConversations: 0,
    reasons: [],
  }
  const sentiment = data?.sentiment || {
    distribution: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
    total: 0,
  }

  // Calculation variables
  const automationRate =
    handoff.totalConversations > 0
      ? Math.round(
          ((handoff.totalConversations - handoff.handoffConversations) /
            handoff.totalConversations) *
            100
        )
      : 100

  const activeReservations =
    (appointments.statusCounts.SCHEDULED || 0) + (appointments.statusCounts.CONFIRMED || 0)

  // Sentiment ratio
  const totalSentiment = sentiment.total || 1
  const posPct = Math.round((sentiment.distribution.POSITIVE / totalSentiment) * 100)
  const neuPct = Math.round((sentiment.distribution.NEUTRAL / totalSentiment) * 100)
  const negPct = Math.round((sentiment.distribution.NEGATIVE / totalSentiment) * 100)

  // Estimación de ROI: 15 mins guardados por chat automatizado ($20/hr promedio)
  const automatedChatsCount = Math.max(0, handoff.totalConversations - handoff.handoffConversations)
  const calculatedRoi = automatedChatsCount * 0.25 * 20

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header & Filter Row */}
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Análisis y Reportes</h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginTop: '0.25rem',
              fontSize: '0.875rem',
            }}
          >
            Métricas de atención al cliente, conversión de citas y desempeño del agente de IA
          </p>
        </div>

        {/* Timeframe selector button group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
            }}
          >
            {(
              [
                { id: '7d', label: '7 días' },
                { id: '30d', label: '30 días' },
                { id: '90d', label: '90 días' },
                { id: 'all', label: 'Histórico' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTimeframe(btn.id)}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  background: timeframe === btn.id ? '#6172f3' : 'transparent',
                  color: timeframe === btn.id ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => void fetchAnalytics()}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.5rem' }}
            title="Actualizar datos"
            disabled={loading}
          >
            <ArrowClockwise size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Card 1: Mensajes */}
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <span
              style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
            >
              VOLUMEN MENSAJES
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
              {messages.total.toLocaleString()}
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: '0.25rem',
              }}
            >
              📥 {messages.incoming.toLocaleString()} / 📤 {messages.outgoing.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(97, 114, 243, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Chats size={22} color="#6172f3" />
          </div>
        </div>

        {/* Card 2: Automatización */}
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <span
              style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
            >
              TASA AUTOMATIZACIÓN
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
              {automationRate}%
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: '0.25rem',
              }}
            >
              Resuelto por el bot sin intervención
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(37, 211, 102, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Robot size={22} color="#25d366" />
          </div>
        </div>

        {/* Card 3: Citas Agendadas */}
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <span
              style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
            >
              CONVERSIÓN DE CITAS
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
              {appointments.conversionRate}%
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: '0.25rem',
              }}
            >
              {appointments.convertedConversations} de {appointments.totalConversations} chats con
              cita
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkle size={22} color="#f59e0b" weight="fill" />
          </div>
        </div>

        {/* Card 4: Satisfacción */}
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <span
              style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
            >
              INDICE SATISFACCIÓN (NPS)
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
              {nps.scoreAverage > 0 ? `${nps.scoreAverage} / 5.0` : 'S/D'}
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                color: nps.npsScore >= 50 ? '#22c55e' : nps.npsScore >= 0 ? '#f59e0b' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: '0.25rem',
                fontWeight: 600,
              }}
            >
              NPS: {nps.npsScore > 0 ? `+${nps.npsScore}` : nps.npsScore} ({nps.totalFeedbacks}{' '}
              opiniones)
            </span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={22} color="#ef4444" weight="fill" />
          </div>
        </div>
      </div>

      {/* Main Graphs Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1.2fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Card: Trend Graph */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <TrendUp size={18} color="#6172f3" />
              Tendencia de Interacción (Mensajes Diarios)
            </span>
            <span className="badge badge-info">
              {timeframe === '7d'
                ? 'Últimos 7 días'
                : timeframe === '30d'
                  ? 'Últimos 30 días'
                  : timeframe === '90d'
                    ? 'Últimos 90 días'
                    : 'Historial completo'}
            </span>
          </div>

          {messages.dailyTrend && messages.dailyTrend.length > 0 ? (
            <div style={{ padding: '0 0.5rem' }}>
              <svg viewBox="0 0 600 180" width="100%" height={180} style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="incomingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6172f3" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6172f3" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="outgoingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#25d366" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#25d366" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 20 + ratio * 130
                  return (
                    <line
                      key={ratio}
                      x1={30}
                      y1={y}
                      x2={580}
                      y2={y}
                      stroke="var(--color-border)"
                      strokeWidth="0.5"
                      strokeDasharray="3 3"
                    />
                  )
                })}

                {/* Draw Paths */}
                {(() => {
                  const trendPoints = messages.dailyTrend
                  const maxVal = Math.max(
                    ...trendPoints.map((d) => Math.max(d.incoming, d.outgoing)),
                    5
                  )

                  const stepX = 550 / (trendPoints.length - 1 || 1)

                  const incomingPoints = trendPoints.map((d, i) => ({
                    x: 30 + i * stepX,
                    y: 150 - (d.incoming / maxVal) * 120,
                  }))

                  const outgoingPoints = trendPoints.map((d, i) => ({
                    x: 30 + i * stepX,
                    y: 150 - (d.outgoing / maxVal) * 120,
                  }))

                  const makePath = (pts: Array<{ x: number; y: number }>) =>
                    pts.reduce(
                      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                      ''
                    )

                  const incomingPath = makePath(incomingPoints)
                  const outgoingPath = makePath(outgoingPoints)

                  const incomingArea = `${incomingPath} L ${incomingPoints[incomingPoints.length - 1].x} 150 L ${incomingPoints[0].x} 150 Z`
                  const outgoingArea = `${outgoingPath} L ${outgoingPoints[outgoingPoints.length - 1].x} 150 L ${outgoingPoints[0].x} 150 Z`

                  return (
                    <>
                      {/* Areas */}
                      <path d={incomingArea} fill="url(#incomingGrad)" />
                      <path d={outgoingArea} fill="url(#outgoingGrad)" />

                      {/* Paths */}
                      <path d={incomingPath} fill="none" stroke="#6172f3" strokeWidth="2" />
                      <path d={outgoingPath} fill="none" stroke="#25d366" strokeWidth="1.5" />

                      {/* Endpoint circles */}
                      {trendPoints.length < 35 &&
                        incomingPoints.map((p, idx) => (
                          <circle
                            key={`inc-${idx}`}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            fill="var(--color-bg-surface)"
                            stroke="#6172f3"
                            strokeWidth="1.5"
                            style={{ cursor: 'pointer' }}
                          >
                            <title>{`Entrantes: ${trendPoints[idx].incoming}`}</title>
                          </circle>
                        ))}
                    </>
                  )
                })()}
              </svg>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.75rem',
                  padding: '0 0.5rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {messages.dailyTrend[0]?.date || 'Inicio'}
                </span>
                {/* Legends */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                  <span
                    style={{ color: '#6172f3', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: '50%', background: '#6172f3' }}
                    />
                    Entrantes
                  </span>
                  <span
                    style={{ color: '#25d366', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span
                      style={{ width: 8, height: 8, borderRadius: '50%', background: '#25d366' }}
                    />
                    Salientes
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {messages.dailyTrend[messages.dailyTrend.length - 1]?.date || 'Hoy'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              No hay suficientes datos de mensajes en este período.
            </div>
          )}
        </div>

        {/* Right Area: Sentiment & Active Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Sentiment Distribution */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Smiley size={18} color="#25d366" />
              Distribución de Sentimiento
            </span>

            {/* Tri-color progress bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  height: 16,
                  borderRadius: 8,
                  display: 'flex',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{ width: `${posPct}%`, background: '#22c55e' }}
                  title={`Positivo: ${posPct}%`}
                />
                <div
                  style={{ width: `${neuPct}%`, background: 'var(--color-text-muted)' }}
                  title={`Neutral: ${neuPct}%`}
                />
                <div
                  style={{ width: `${negPct}%`, background: '#ef4444' }}
                  title={`Negativo: ${negPct}%`}
                />
              </div>

              {/* Legends */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
                  />
                  Positivo: {posPct}%
                </span>
                <span
                  style={{
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-text-muted)',
                    }}
                  />
                  Neutral: {neuPct}%
                </span>
                <span
                  style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}
                  />
                  Negativo: {negPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Peak Hours of Activity */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Clock size={18} color="#f59e0b" />
              Horas Pico de Actividad
            </span>

            {messages.peakHours && messages.peakHours.length > 0 ? (
              <div>
                <svg viewBox="0 0 240 70" width="100%" height={70} style={{ overflow: 'visible' }}>
                  {(() => {
                    const maxCount = Math.max(...messages.peakHours.map((h) => h.count), 1)
                    return messages.peakHours.map((h, i) => {
                      const barHeight = (h.count / maxCount) * 50
                      const x = i * 10
                      const y = 60 - barHeight
                      return (
                        <rect
                          key={h.hour}
                          x={x}
                          y={y}
                          width={7}
                          height={barHeight}
                          rx={1.5}
                          fill={h.count === maxCount ? '#f59e0b' : 'rgba(97, 114, 243, 0.7)'}
                          style={{ transition: 'all 0.3s ease' }}
                        >
                          <title>{`Hora ${h.hour}:00: ${h.count} mensajes`}</title>
                        </rect>
                      )
                    })
                  })()}
                </svg>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    fontSize: '0.65rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                Sin registros horaria
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: NPS Distribution & Handoff Reasons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.6fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* NPS Rating Distribution Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Star size={18} color="#ef4444" weight="fill" />
              Distribución de Calificaciones
            </span>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              Puntuaciones dadas en la encuesta de satisfacción
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[5, 4, 3, 2, 1, 0].map((star) => {
              const count = nps.scoreDistribution[star] || 0
              const percentage =
                nps.totalFeedbacks > 0 ? Math.round((count / nps.totalFeedbacks) * 100) : 0
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: 45,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    {star} <Star size={12} weight="fill" color="#f59e0b" />
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: 'var(--color-bg-elevated)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: star >= 4 ? '#22c55e' : star >= 2 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 40,
                      fontSize: '0.725rem',
                      textAlign: 'right',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {count} ({percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Handoff Reasons & Rate Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <WarningCircle size={18} color="var(--color-danger)" />
                Tasa de Transferencia a Humano
              </span>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                }}
              >
                Porcentaje de clientes que solicitaron hablar con un agente humano
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: handoff.handoffRate > 25 ? '#ef4444' : 'var(--color-text-primary)',
                }}
              >
                {handoff.handoffRate}%
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                {handoff.handoffConversations} transferencias
              </span>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.75rem',
              }}
            >
              Motivos más comunes de transferencia:
            </h4>

            {handoff.reasons && handoff.reasons.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {handoff.reasons.map((r, i) => {
                  const pct =
                    handoff.handoffConversations > 0
                      ? Math.round((r.count / handoff.handoffConversations) * 100)
                      : 0
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          {r.reason}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {r.count} veces ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: 'var(--color-bg-elevated)',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #6172f3, #ef4444)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                No se registraron transferencias en este rango de tiempo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Funnel & ROI Card */}
      <div
        className="card"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}
        >
          <Sparkle size={18} color="#25d366" weight="fill" />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            Embudo de Conversión & Retorno de Inversión (ROI) Real
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '2rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Funnel chart SVG */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 600 200" width="100%" height={200} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="funnel1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6172f3" />
                  <stop offset="100%" stopColor="#4a56e8" />
                </linearGradient>
                <linearGradient id="funnel2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a56e8" />
                  <stop offset="100%" stopColor="#25d366" />
                </linearGradient>
                <linearGradient id="funnel3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#25d366" />
                  <stop offset="100%" stopColor="#128c7e" />
                </linearGradient>
              </defs>

              {/* Trapezoide 1: Chats Totales */}
              <polygon points="150,15 450,15 420,65 180,65" fill="url(#funnel1)" opacity="0.95" />
              <text x="300" y="44" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">
                Chats Totales: {appointments.totalConversations}
              </text>

              {/* Trapezoide 2: Resuelto por Bot */}
              <polygon points="182,70 418,70 390,120 210,120" fill="url(#funnel2)" opacity="0.95" />
              <text x="300" y="99" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">
                Automatizados: {automatedChatsCount} ({automationRate}%)
              </text>

              {/* Trapezoide 3: Citas Agendadas */}
              <polygon
                points="212,125 388,125 360,175 240,175"
                fill="url(#funnel3)"
                opacity="0.95"
              />
              <text x="300" y="154" fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">
                Citas Agendadas: {appointments.convertedConversations} (
                {appointments.conversionRate}%)
              </text>
            </svg>
          </div>

          {/* ROI Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
              >
                AHORRO ESTIMADO EN SOPORTE
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#22c55e',
                  marginTop: '0.25rem',
                }}
              >
                + $
                {calculatedRoi.toLocaleString('es-MX', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{' '}
                USD
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '0.25rem',
                }}
              >
                Calculado en base a {automatedChatsCount} chats resueltos por el asistente,
                ahorrando 15 min de agente por chat ($20/hr).
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}
              >
                ESTADO DE AGENDAS
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  marginTop: '0.25rem',
                }}
              >
                {activeReservations} Citas Activas
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '0.25rem',
                }}
              >
                Citas programadas o confirmadas en Google Calendar para este período (excluye
                canceladas y completadas).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
