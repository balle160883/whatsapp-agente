'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Megaphone,
  PaperPlaneTilt,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  CircleNotch,
  MagnifyingGlass,
  Plus,
  Trash,
  UploadSimple,
  FileCsv,
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Contact {
  id: string
  fullName: string | null
  phone: string
}

interface Campaign {
  id: string
  name: string
  message: string
  sentAt: string
  totalRecipients: number
  recipients: Array<{ name: string; phone: string; status: string }>
  isScheduled?: boolean
}

export default function CampanasPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  // Loading states
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sending, setSending] = useState(false)

  // Form states
  const [campaignName, setCampaignName] = useState('')
  const [campaignMessage, setCampaignMessage] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [searchContact, setSearchContact] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  // CSV states
  const [recipientMode, setRecipientMode] = useState<'crm' | 'csv'>('crm')
  const [csvContacts, setCsvContacts] = useState<{ name: string; phone: string }[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Scheduling states
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [cancellingCampaignId, setCancellingCampaignId] = useState<string | null>(null)

  // Historial expandido
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

  // Obtener contactos
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true)
      const res = await fetch('/api/contacts')
      const data = (await res.json()) as { contacts: Contact[] }
      setContacts(data.contacts ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  // Obtener historial
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const res = await fetch('/api/campaigns')
      const data = (await res.json()) as { campaigns: Campaign[] }
      setCampaigns(data.campaigns ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    if (activeTab === 'history') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchHistory()
    }
  }, [activeTab, fetchHistory])

  // Manejar checkboxes de contactos
  const handleSelectContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id))
    }
  }

  // Filtrar contactos según búsqueda
  const filteredContacts = contacts.filter((c) => {
    const name = c.fullName?.toLowerCase() ?? ''
    const phone = c.phone
    const q = searchContact.toLowerCase()
    return name.includes(q) || phone.includes(q)
  })

  // Parsear archivo CSV cargado
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/)
    const results: Array<{ name: string; phone: string }> = []

    let nameIdx = -1
    let phoneIdx = -1

    if (lines.length > 0) {
      const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase())
      nameIdx = headers.findIndex((h) => h.includes('nombre') || h.includes('name'))
      phoneIdx = headers.findIndex(
        (h) =>
          h.includes('telefono') ||
          h.includes('tel') ||
          h.includes('phone') ||
          h.includes('celular') ||
          h.includes('cel')
      )
    }

    // Fallback si no hay cabeceras limpias: columna 0 nombre, columna 1 teléfono
    if (nameIdx === -1) nameIdx = 0
    if (phoneIdx === -1) phoneIdx = 1

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      if (cols.length <= Math.max(nameIdx, phoneIdx)) continue

      const name = cols[nameIdx] || 'Cliente'
      const phone = cols[phoneIdx]?.replace(/[^0-9]/g, '')
      if (phone && phone.length >= 8) {
        results.push({ name, phone })
      }
    }
    return results
  }

  const handleCsvFile = (file: File) => {
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const contactsParsed = parseCSV(text)
      setCsvContacts(contactsParsed)
    }
    reader.readAsText(file)
  }

  // Cancelar campaña programada pendiente
  const handleCancelCampaign = async (campaignId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta campaña programada?')) return
    setCancellingCampaignId(campaignId)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cancelar la campaña')
      }
      setFeedback({
        type: 'success',
        message: 'Campaña programada cancelada con éxito.',
      })
      void fetchHistory()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error de red al cancelar',
      })
    } finally {
      setCancellingCampaignId(null)
    }
  }

  // Enviar o programar campaña
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isCsvMode = recipientMode === 'csv'
    const recipientsSelected = isCsvMode ? csvContacts.length > 0 : selectedContacts.length > 0

    if (!campaignName.trim() || !campaignMessage.trim() || !recipientsSelected) return

    setSending(true)
    setFeedback(null)

    // Validar fecha de programación si está activado
    let scheduledAt = undefined
    if (isScheduled) {
      if (!scheduledDate) {
        setFeedback({
          type: 'error',
          message: 'Por favor, selecciona una fecha y hora para programar',
        })
        setSending(false)
        return
      }
      const schedDate = new Date(scheduledDate)
      if (schedDate <= new Date()) {
        setFeedback({ type: 'error', message: 'La fecha de programación debe ser en el futuro' })
        setSending(false)
        return
      }
      scheduledAt = schedDate.toISOString()
    }

    try {
      const payload = {
        name: campaignName,
        message: campaignMessage,
        ...(isCsvMode ? { csvContacts } : { contactIds: selectedContacts }),
        ...(scheduledAt ? { scheduledAt } : {}),
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await res.json()) as { error?: string; isScheduled?: boolean }

      if (!res.ok) {
        throw new Error(data.error || 'Fallo al procesar campaña')
      }

      if (data.isScheduled) {
        setFeedback({
          type: 'success',
          message: `¡Campaña "${campaignName}" programada con éxito para el ${format(
            parseISO(scheduledAt!),
            "d 'de' MMMM 'a las' HH:mm",
            { locale: es }
          )}!`,
        })
      } else {
        const count = isCsvMode ? csvContacts.length : selectedContacts.length
        setFeedback({
          type: 'success',
          message: `¡Campaña "${campaignName}" enviada con éxito a ${count} destinatarios!`,
        })
      }

      // Reset de campos
      setCampaignName('')
      setCampaignMessage('')
      setSelectedContacts([])
      setCsvContacts([])
      setCsvFileName('')
      setIsScheduled(false)
      setScheduledDate('')
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error de red al enviar la campaña',
      })
    } finally {
      setSending(false)
    }
  }

  // Agregar contacto dummy real
  const handleAddDummyContact = async () => {
    try {
      setLoadingContacts(true)
      const names = ['Carlos Gómez', 'Sofía Ruiz', 'Roberto Díaz', 'Elena Torres']
      const phoneBase = '52155' + Math.floor(10000000 + Math.random() * 90000000)

      await fetch('/api/contacts/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: names[Math.floor(Math.random() * names.length)],
          phone: phoneBase,
        }),
      })
      void fetchContacts()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Campañas de WhatsApp</h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginTop: '0.25rem',
            fontSize: '0.875rem',
          }}
        >
          Envía mensajes masivos personalizados a tus listas de clientes de forma directa
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'create' ? '2px solid var(--color-brand-500)' : '2px solid transparent',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'create' ? 600 : 500,
            color:
              activeTab === 'create' ? 'var(--color-brand-400)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          <Megaphone size={18} />
          Crear Campaña
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'history'
                ? '2px solid var(--color-brand-500)'
                : '2px solid transparent',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'history' ? 600 : 500,
            color:
              activeTab === 'history' ? 'var(--color-brand-400)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          <Clock size={18} />
          Historial de Campañas
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '1rem',
            background:
              feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border:
              feedback.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            color: feedback.type === 'success' ? '#22c55e' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tab: Crear Campaña */}
      {activeTab === 'create' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* Formulario */}
          <div className="card" style={{ background: 'var(--color-bg-card)' }}>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Nombre de la Campaña
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Promoción de Verano 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Mensaje a enviar
                </label>
                <textarea
                  className="input"
                  style={{ minHeight: '160px' }}
                  placeholder="Hola {{nombre}}, tenemos una oferta del 20% en todos nuestros servicios de consulta médica para ti."
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  required
                />
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginTop: '0.375rem',
                  }}
                >
                  Usa{' '}
                  <code
                    style={{
                      background: 'var(--color-bg-surface)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    {'{{nombre}}'}
                  </code>{' '}
                  para insertar el nombre del cliente dinámicamente.
                </span>
              </div>

              {/* Programación de Campaña */}
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-bg-surface, rgba(255,255,255,0.02))',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  marginTop: '0.5rem',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <label
                    htmlFor="schedule-checkbox"
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    🚀 Programar envío para después
                  </label>
                  <input
                    id="schedule-checkbox"
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </div>

                {isScheduled && (
                  <div
                    style={{
                      marginTop: '0.875rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <label
                      htmlFor="scheduled-date"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Fecha y Hora de Envío
                    </label>
                    <input
                      id="scheduled-date"
                      type="datetime-local"
                      className="input"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required={isScheduled}
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  sending ||
                  (recipientMode === 'crm'
                    ? selectedContacts.length === 0
                    : csvContacts.length === 0)
                }
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                {sending ? (
                  <>
                    <CircleNotch size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                    {isScheduled ? 'Programando campaña...' : 'Enviando campaña...'}
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt size={18} />
                    {isScheduled
                      ? `Programar campaña para ${recipientMode === 'crm' ? selectedContacts.length : csvContacts.length} contactos`
                      : `Enviar a ${recipientMode === 'crm' ? selectedContacts.length : csvContacts.length} contactos`}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Selector de Destinatarios */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px' }}
          >
            {/* Cabecera / Título de Destinatarios */}
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
                <Users size={18} />
                Destinatarios
              </span>
              {recipientMode === 'crm' && contacts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8098f9',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedContacts.length === filteredContacts.length
                    ? 'Desmarcar todos'
                    : 'Seleccionar todos'}
                </button>
              )}
            </div>

            {/* Pestañas de modo de destinatarios */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                background: 'var(--color-bg-surface)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setRecipientMode('crm')}
                style={{
                  flex: 1,
                  background: recipientMode === 'crm' ? 'rgba(97, 114, 243, 0.15)' : 'none',
                  border: 'none',
                  color:
                    recipientMode === 'crm'
                      ? 'var(--color-brand-400)'
                      : 'var(--color-text-secondary)',
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                }}
              >
                <Users size={16} />
                Seleccionar de CRM
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode('csv')}
                style={{
                  flex: 1,
                  background: recipientMode === 'csv' ? 'rgba(97, 114, 243, 0.15)' : 'none',
                  border: 'none',
                  color:
                    recipientMode === 'csv'
                      ? 'var(--color-brand-400)'
                      : 'var(--color-text-secondary)',
                  padding: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                }}
              >
                <FileCsv size={16} />
                Subir Archivo CSV
              </button>
            </div>

            {recipientMode === 'crm' ? (
              <>
                {/* Búsqueda rápida */}
                <div style={{ position: 'relative' }}>
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
                    style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
                    placeholder="Buscar contacto..."
                    value={searchContact}
                    onChange={(e) => setSearchContact(e.target.value)}
                  />
                </div>

                {/* Listado de Contactos */}
                {loadingContacts ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="spinner" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem' }}>
                      No tienes contactos en tu base de datos todavía.
                    </span>
                    <button
                      type="button"
                      onClick={handleAddDummyContact}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={14} /> Cargar Contactos de Prueba
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      maxHeight: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredContacts.length === 0 ? (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-muted)',
                          textAlign: 'center',
                          padding: '2rem 0',
                        }}
                      >
                        Sin coincidencias
                      </span>
                    ) : (
                      filteredContacts.map((contact) => {
                        const isChecked = selectedContacts.includes(contact.id)
                        return (
                          <div
                            key={contact.id}
                            onClick={() => handleSelectContact(contact.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.625rem 0.75rem',
                              background: isChecked
                                ? 'rgba(97, 114, 243, 0.08)'
                                : 'var(--color-bg-elevated)',
                              border: isChecked
                                ? '1px solid rgba(97, 114, 243, 0.3)'
                                : '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // se maneja con el click del div
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: 'var(--color-text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {contact.fullName ?? 'Sin Nombre'}
                              </span>
                              <span
                                style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}
                              >
                                {contact.phone}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {/* Botón para meter otro dummy si se quiere probar */}
                {contacts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddDummyContact}
                    style={{
                      marginTop: 'auto',
                      background: 'none',
                      border: '1px dashed var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = 'rgba(97, 114, 243, 0.35)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--color-border)')
                    }
                  >
                    <Plus size={12} /> Agregar un contacto de prueba
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                {/* Zona Drag & Drop / Input file */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                      handleCsvFile(file)
                    }
                  }}
                  style={{
                    border: dragOver
                      ? '2px dashed var(--color-brand-500)'
                      : '2px dashed var(--color-border)',
                    background: dragOver ? 'rgba(97, 114, 243, 0.05)' : 'var(--color-bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                  }}
                  onClick={() => {
                    document.getElementById('csv-file-input')?.click()
                  }}
                >
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCsvFile(file)
                    }}
                  />
                  <UploadSimple size={32} style={{ color: 'var(--color-brand-400)' }} />
                  <div>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'block',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {csvFileName || 'Arrastra tu archivo CSV aquí'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        display: 'block',
                        marginTop: '0.25rem',
                      }}
                    >
                      o haz clic para explorar tus archivos
                    </span>
                  </div>
                </div>

                {/* Previsualizador de contactos del CSV */}
                {csvContacts.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginTop: 'auto',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Vista previa (primeros 5 contactos de {csvContacts.length}):
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem',
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
                      {csvContacts.slice(0, 5).map((contact, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {contact.name}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{contact.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.5rem',
                      lineHeight: '1.4',
                    }}
                  >
                    💡 El archivo CSV debe contener columnas para el <strong>nombre</strong> y{' '}
                    <strong>teléfono</strong> (con código de país, ej. 5215512345678).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'history' && (
        <div className="card">
          {loadingHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner" />
            </div>
          ) : campaigns.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <Clock size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontSize: '0.9375rem' }}>
                No has enviado ninguna campaña todavía.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {campaigns.map((camp) => {
                const isExpanded = expandedCampaignId === camp.id
                const successfulCount = camp.recipients.filter((r) => r.status === 'Enviado').length
                const successRate = Math.round((successfulCount / camp.totalRecipients) * 100)

                return (
                  <div
                    key={camp.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-bg-card)',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Fila Encabezado */}
                    <div
                      onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {camp.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {camp.isScheduled ? 'Programado para el ' : 'Enviado el '}
                          {format(parseISO(camp.sentAt), "d 'de' MMMM 'a las' HH:mm", {
                            locale: es,
                          })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {camp.isScheduled && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                              borderRadius: 'var(--radius-sm)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Clock size={12} /> Programado
                          </span>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                          }}
                        >
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {camp.totalRecipients} destinatarios
                          </span>
                          {!camp.isScheduled ? (
                            <span
                              style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 500 }}
                            >
                              {successRate}% entregado
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                fontWeight: 500,
                              }}
                            >
                              Pendiente
                            </span>
                          )}
                        </div>
                        {camp.isScheduled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation() // Evitar expandir/colapsar la fila
                              void handleCancelCampaign(camp.id)
                            }}
                            disabled={cancellingCampaignId === camp.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'all 0.2s',
                              opacity: cancellingCampaignId === camp.id ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')
                            }
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            title="Cancelar campaña programada"
                          >
                            {cancellingCampaignId === camp.id ? (
                              <CircleNotch size={16} className="animate-spin" />
                            ) : (
                              <Trash size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fila Expandida */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '1.25rem',
                          background: 'var(--color-bg-surface)',
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-text-muted)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              marginBottom: '0.375rem',
                            }}
                          >
                            Mensaje Plantilla
                          </div>
                          <div
                            style={{
                              padding: '0.75rem',
                              background: 'var(--color-bg-elevated)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.8125rem',
                              color: 'var(--color-text-primary)',
                              whiteSpace: 'pre-wrap',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {camp.message}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-text-muted)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              marginBottom: '0.5rem',
                            }}
                          >
                            Estado de Entrega
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.375rem',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              paddingRight: '4px',
                            }}
                          >
                            {camp.recipients.map((rec, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem 0.75rem',
                                  background: 'var(--color-bg-elevated)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <span>
                                  {rec.name} ({rec.phone})
                                </span>
                                <span
                                  className={`badge ${rec.status === 'Enviado' ? 'badge-success' : 'badge-danger'}`}
                                  style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}
                                >
                                  {rec.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
