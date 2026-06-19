'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CalendarCheck,
  CalendarX,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Hourglass,
  GoogleLogo,
  Check,
  Star,
  Bell,
  DownloadSimple,
  FunnelSimple,
  X,
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Appointment {
  id: string
  service: string
  startsAt: string
  endsAt: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  googleEventId: string | null
  contact: { fullName: string | null; phone: string }
  feedback?: { id: string; status: string } | null
  reminderSent: boolean
  reminderSentAt: string | null
}

interface Filters {
  status: string
  service: string
  startDate: string
  endDate: string
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Programada', badgeClass: 'badge-info', icon: Hourglass },
  CONFIRMED: { label: 'Confirmada', badgeClass: 'badge-success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', badgeClass: 'badge-danger', icon: XCircle },
  COMPLETED: { label: 'Completada', badgeClass: 'badge-muted', icon: CheckCircle },
}

export default function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    service: '',
    startDate: '',
    endDate: '',
  })
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const url = `/api/appointments?${params.toString()}`
      const res = await fetch(url)
      const data = (await res.json()) as { appointments: Appointment[] }
      setAppointments(data.appointments ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const handleComplete = useCallback(
    async (id: string) => {
      setProcessingId(id)
      try {
        const res = await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'COMPLETED' }),
        })
        if (res.ok) {
          await fetchAppointments()
        }
      } catch (e) {
        console.error(e)
      } finally {
        setProcessingId(null)
      }
    },
    [fetchAppointments]
  )

  const handleSendReminder = useCallback(
    async (id: string) => {
      setProcessingId(id)
      try {
        const res = await fetch(`/api/appointments/${id}/send-reminder`, {
          method: 'POST',
        })
        if (res.ok) {
          await fetchAppointments()
        }
      } catch (e) {
        console.error(e)
      } finally {
        setProcessingId(null)
      }
    },
    [fetchAppointments]
  )

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      service: '',
      startDate: '',
      endDate: '',
    })
    setStatusFilter('all')
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAppointments()
  }, [fetchAppointments])

  // Apply client-side status filter for the stats buttons
  const filtered = statusFilter === 'all' ? appointments : appointments.filter((a) => a.status === statusFilter)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Citas</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Gestión de citas sincronizadas con Google Calendar
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <FunnelSimple size={16} />
            Filtros
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/appointments/export');
                if (!res.ok) throw new Error('Error al exportar');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `citas-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error al exportar:', error);
                alert('Error al exportar el CSV');
              }
            }}
            className="btn btn-secondary"
          >
            <DownloadSimple size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600 }}>Filtros</span>
            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <X size={14} />
              Limpiar
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Servicio
              </label>
              <input
                type="text"
                className="input"
                placeholder="Buscar servicio..."
                value={filters.service}
                onChange={(e) => handleFilterChange('service', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Fecha desde
              </label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Fecha hasta
              </label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const).map((status) => {
          const count = appointments.filter((a) => a.status === status).length
          const cfg = STATUS_CONFIG[status]
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className="card"
              style={{
                flex: 1,
                cursor: 'pointer',
                background:
                  statusFilter === status ? 'var(--color-bg-elevated)' : 'var(--color-bg-surface)',
                border:
                  statusFilter === status
                    ? '1px solid rgba(97,114,243,0.4)'
                    : '1px solid var(--color-border)',
                textAlign: 'left',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{count}</div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.125rem',
                }}
              >
                {cfg.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--color-text-muted)' }}
        >
          <CalendarX size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p>No hay citas {statusFilter !== 'all' ? 'con este estado' : 'registradas'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {[
                  'Paciente',
                  'Servicio',
                  'Fecha y hora',
                  'Duración',
                  'Estado',
                  'Google Calendar',
                  'Acciones',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.875rem 1.25rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status]
                const StatusIcon = cfg.icon
                const start = parseISO(apt.startsAt)
                const end = parseISO(apt.endsAt)
                const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)

                return (
                  <tr
                    key={apt.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        'var(--color-bg-elevated)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'transparent')
                    }
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6172f3, #a4bbfc)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <User size={14} color="#fff" weight="fill" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {apt.contact.fullName ?? 'Sin nombre'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {apt.contact.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>{apt.service}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <CalendarCheck size={14} color="#6172f3" />
                        {format(start, 'EEEE d MMM', { locale: es })}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          marginTop: '0.125rem',
                        }}
                      >
                        <Clock size={14} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '1rem 1.25rem',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {durationMin} min
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className={`badge ${cfg.badgeClass}`}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {apt.googleEventId ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                          <GoogleLogo size={10} weight="fill" />
                          Sincronizada
                        </span>
                      ) : (
                        <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>
                          No sync
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                          <>
                            <button
                              onClick={() => handleSendReminder(apt.id)}
                              disabled={processingId === apt.id}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: apt.reminderSent
                                  ? '1px solid #22c55e'
                                  : '1px solid var(--color-border)',
                                background: apt.reminderSent
                                  ? '#dcfce7'
                                  : 'var(--color-bg-surface)',
                                cursor:
                                  processingId === apt.id || apt.reminderSent
                                    ? 'not-allowed'
                                    : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              {processingId === apt.id ? (
                                <div className="spinner" style={{ width: 12, height: 12 }} />
                              ) : (
                                <Bell size={12} />
                              )}
                              {apt.reminderSent ? 'Recordatorio enviado' : 'Enviar recordatorio'}
                            </button>
                            <button
                              onClick={() => handleComplete(apt.id)}
                              disabled={processingId === apt.id}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-surface)',
                                cursor: processingId === apt.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              {processingId === apt.id ? (
                                <div className="spinner" style={{ width: 12, height: 12 }} />
                              ) : (
                                <Check size={12} />
                              )}
                              Completar
                            </button>
                          </>
                        )}
                        {apt.feedback && (
                          <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                            <Star size={10} />
                            Encuesta{' '}
                            {apt.feedback.status === 'RESPONDED' ? 'respondida' : 'enviada'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
