'use client'

import { useEffect, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FunnelSimple, X } from '@phosphor-icons/react'

interface FeedbackItem {
  id: string
  contact: {
    id: string
    fullName: string | null
    phone: string
  }
  appointment?: {
    id: string
    service: string
    startsAt: string
  } | null
  score: number | null
  comment: string | null
  npsCategory: 'PROMOTER' | 'PASSIVE' | 'DETRACTOR' | null
  sentiment: string | null
  isHighPriority: boolean
  status: 'PENDING' | 'SENT' | 'RESPONDED'
  createdAt: string
}

interface Stats {
  total: number
  responded: number
  pending: number
  highPriority: number
  averageScore: string
  nps: number
  promoters: number
  passives: number
  detractors: number
}

interface Filters {
  status: string
  minScore: string
  maxScore: string
  npsCategory: string
  sentiment: string
  isHighPriority: string
  startDate: string
  endDate: string
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    minScore: '',
    maxScore: '',
    npsCategory: '',
    sentiment: '',
    isHighPriority: '',
    startDate: '',
    endDate: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const url = `/api/feedback?${params.toString()}`
      const res = await fetch(url)
      const data = await res.json()
      setFeedbacks(data.feedbacks)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      minScore: '',
      maxScore: '',
      npsCategory: '',
      sentiment: '',
      isHighPriority: '',
      startDate: '',
      endDate: '',
    })
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'bg-gray-200'
    if (score >= 4) return 'bg-green-500'
    if (score >= 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function getNpsColor(category: string | null) {
    if (!category) return 'text-gray-500'
    if (category === 'PROMOTER') return 'text-green-600'
    if (category === 'PASSIVE') return 'text-yellow-600'
    return 'text-red-600'
  }

  function getNpsLabel(category: string | null) {
    if (!category) return 'Sin calificar'
    if (category === 'PROMOTER') return 'Promotor'
    if (category === 'PASSIVE') return 'Pasivo'
    return 'Detractor'
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback y NPS</h1>
          <p className="text-gray-600">Monitorea la satisfacción de tus clientes</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 transition"
          >
            <FunnelSimple size={16} />
            <span>Filtros</span>
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/feedback/export');
                if (!res.ok) throw new Error('Error al exportar');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `feedbacks-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error al exportar:', error);
                alert('Error al exportar el CSV');
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filtros</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="SENT">Enviado</option>
                <option value="RESPONDED">Respondido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calificación mínima</label>
              <input
                type="number"
                min="0"
                max="5"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', e.target.value)}
                placeholder="0-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calificación máxima</label>
              <input
                type="number"
                min="0"
                max="5"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.maxScore}
                onChange={(e) => handleFilterChange('maxScore', e.target.value)}
                placeholder="0-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría NPS</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.npsCategory}
                onChange={(e) => handleFilterChange('npsCategory', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="PROMOTER">Promotor</option>
                <option value="PASSIVE">Pasivo</option>
                <option value="DETRACTOR">Detractor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sentimiento</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.sentiment}
                onChange={(e) => handleFilterChange('sentiment', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="positive">Positivo</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad alta</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.isHighPriority}
                onChange={(e) => handleFilterChange('isHighPriority', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Score Promedio</p>
                <p className="text-3xl font-bold text-blue-600">{stats.averageScore}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">NPS</p>
                <p className="text-3xl font-bold text-purple-600">{Math.round(stats.nps)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Respuestas</p>
                <p className="text-3xl font-bold text-green-600">{stats.responded}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alerta Prioridad Alta</p>
                <p className="text-3xl font-bold text-red-600">{stats.highPriority}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* NPS Distribution Chart */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución NPS</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Promotores', value: stats.promoters, color: '#10b981' },
                      { name: 'Pasivos', value: stats.passives, color: '#f59e0b' },
                      { name: 'Detractores', value: stats.detractors, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Promotores', value: stats.promoters, color: '#10b981' },
                      { name: 'Pasivos', value: stats.passives, color: '#f59e0b' },
                      { name: 'Detractores', value: stats.detractors, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score Distribution Chart */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución de Calificaciones</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(() => {
                    const counts = [0, 0, 0, 0, 0, 0]; // 0-5 stars
                    feedbacks.forEach(item => {
                      if (item.score !== null) {
                        counts[item.score]++;
                      }
                    });
                    return counts.map((count, score) => ({ score: `${score}`, count }));
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Últimas Respuestas</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {feedbacks.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.contact.fullName || item.contact.phone}
                    </h3>
                    {item.isHighPriority && (
                      <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Prioridad Alta
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getNpsColor(item.npsCategory)}`}
                    >
                      {getNpsLabel(item.npsCategory)}
                    </span>
                  </div>
                  {item.appointment && (
                    <p className="mt-1 text-sm text-gray-500">
                      {item.appointment.service} •{' '}
                      {new Date(item.appointment.startsAt).toLocaleDateString('es-ES')}
                    </p>
                  )}
                  {item.comment && (
                    <p className="mt-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
                      {item.comment}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  {item.score !== null && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white ${getScoreColor(item.score)}`}
                      >
                        {item.score}
                      </div>
                      <span className="text-sm text-gray-500">/5</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {new Date(item.createdAt).toLocaleString('es-ES')}
              </div>
            </div>
          ))}
          {feedbacks.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">No hay feedbacks aún.</div>
          )}
        </div>
      </div>
    </div>
  )
}
