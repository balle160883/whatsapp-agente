'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  WhatsappLogo,
  GoogleLogo,
  Robot,
  CheckCircle,
  XCircle,
  CircleNotch,
  FloppyDisk,
  Eye,
  EyeSlash,
  Link as LinkIcon,
  Warning,
} from '@phosphor-icons/react'

// ── Types ────────────────────────────────────────────────────────────────────
interface WAConfig {
  phoneNumberId: string
  wabaId: string
  verifyToken: string
  isActive: boolean
  hasAccessToken: boolean
  hasAppSecret: boolean
}

interface GCalConfig {
  isConnected: boolean
  calendarId: string | null
  calendarName: string | null
}

interface AIConfig {
  provider: string
  hasApiKey: boolean
  customEndpoint: string | null
  customModel: string | null
}

// ── WhatsApp Section ─────────────────────────────────────────────────────────
function WhatsAppSection() {
  const [config, setConfig] = useState<WAConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showToken, setShowToken] = useState(false)

  const [form, setForm] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    verifyToken: '',
    appSecret: '',
  })

  useEffect(() => {
    fetch('/api/integrations/whatsapp')
      .then((r) => r.json())
      .then((data: WAConfig | null) => {
        if (data) {
          setConfig(data)
          setForm((f) => ({
            ...f,
            phoneNumberId: data.phoneNumberId,
            wabaId: data.wabaId,
            verifyToken: data.verifyToken,
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function save() {
    setSaving(true)
    await fetch('/api/integrations/whatsapp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setConfig((prev) => (prev ? { ...prev, ...form, isActive: true } : null))
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/whatsapp', { method: 'POST' })
      const data = (await res.json()) as {
        success: boolean
        displayPhoneNumber?: string
        error?: string
      }
      setTestResult({
        success: data.success,
        message: data.success
          ? `✓ Conectado: ${data.displayPhoneNumber}`
          : `✗ Error: ${data.error}`,
      })
    } finally {
      setTesting(false)
    }
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.5rem',
  }

  return (
    <div className="card">
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            background: 'rgba(37,211,102,0.15)',
            border: '1px solid rgba(37,211,102,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WhatsappLogo size={22} color="#25d366" weight="fill" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>WhatsApp Cloud API</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {config?.isActive ? (
              <span
                style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <span className="status-dot status-dot-green" /> Configurado y activo
              </span>
            ) : (
              'No configurado'
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Phone Number ID</label>
              <input
                id="wa-phone-id"
                type="text"
                className="input"
                placeholder="1234567890"
                value={form.phoneNumberId}
                onChange={update('phoneNumberId')}
              />
            </div>
            <div>
              <label style={labelStyle}>WABA ID</label>
              <input
                id="wa-waba-id"
                type="text"
                className="input"
                placeholder="9876543210"
                value={form.wabaId}
                onChange={update('wabaId')}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Access Token</label>
            <div style={{ position: 'relative' }}>
              <input
                id="wa-access-token"
                type={showToken ? 'text' : 'password'}
                className="input"
                placeholder={config?.hasAccessToken ? '••••••••• (ya guardado)' : 'EAA...'}
                value={form.accessToken}
                onChange={update('accessToken')}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                {showToken ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Verify Token (webhook)</label>
              <input
                id="wa-verify-token"
                type="text"
                className="input"
                placeholder="mi-token-secreto"
                value={form.verifyToken}
                onChange={update('verifyToken')}
              />
            </div>
            <div>
              <label style={labelStyle}>App Secret</label>
              <input
                id="wa-app-secret"
                type="password"
                className="input"
                placeholder={config?.hasAppSecret ? '••••••••• (ya guardado)' : 'App secret'}
                value={form.appSecret}
                onChange={update('appSecret')}
              />
            </div>
          </div>

          {/* Webhook URL */}
          <div
            style={{
              padding: '0.875rem',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.375rem',
                fontWeight: 500,
              }}
            >
              URL del Webhook
            </div>
            <code style={{ fontSize: '0.8125rem', color: '#8098f9' }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp
            </code>
          </div>

          {testResult && (
            <div
              style={{
                padding: '0.75rem',
                background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 'var(--radius-md)',
                color: testResult.success ? '#22c55e' : '#ef4444',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {testResult.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              id="save-wa-config"
              onClick={save}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <CircleNotch size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <FloppyDisk size={16} />
              )}
              Guardar configuración
            </button>
            <button
              id="test-wa-connection"
              onClick={testConnection}
              className="btn btn-secondary"
              disabled={testing}
            >
              {testing ? (
                <CircleNotch size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <CheckCircle size={16} />
              )}
              Probar conexión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Google Calendar Section ──────────────────────────────────────────────────
function GoogleCalendarSection() {
  const [config, setConfig] = useState<GCalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const searchParams = useSearchParams()

  const successMsg = searchParams.get('success')
  const errorMsg = searchParams.get('error')

  useEffect(() => {
    fetch('/api/integrations/google-calendar')
      .then((r) => r.json())
      .then((data: GCalConfig | null) => setConfig(data))
      .finally(() => setLoading(false))
  }, [])

  async function connectGoogle() {
    const res = await fetch('/api/integrations/google-calendar?action=auth-url')
    const data = (await res.json()) as { url: string }
    window.location.href = data.url
  }

  async function disconnect() {
    setDisconnecting(true)
    await fetch('/api/integrations/google-calendar', { method: 'DELETE' })
    setConfig((prev) => (prev ? { ...prev, isConnected: false } : null))
    setDisconnecting(false)
  }

  return (
    <div className="card">
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GoogleLogo size={22} color="#3b82f6" weight="fill" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Google Calendar</div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: config?.isConnected ? '#22c55e' : 'var(--color-text-muted)',
            }}
          >
            {config?.isConnected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span className="status-dot status-dot-green" /> Conectado: {config.calendarName}
              </span>
            ) : (
              'No conectado'
            )}
          </div>
        </div>
      </div>

      {successMsg === 'google_connected' && (
        <div
          style={{
            padding: '0.75rem',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#22c55e',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle size={16} /> Google Calendar conectado exitosamente.
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.75rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Warning size={16} /> Error al conectar con Google Calendar.
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <div>
          {config?.isConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Calendario activo
                </div>
                <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{config.calendarName}</div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.125rem',
                  }}
                >
                  {config.calendarId}
                </div>
              </div>
              <button
                id="disconnect-gcal"
                onClick={disconnect}
                className="btn btn-danger"
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <CircleNotch size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <XCircle size={16} />
                )}
                Desconectar Google Calendar
              </button>
            </div>
          ) : (
            <button id="connect-gcal" onClick={connectGoogle} className="btn btn-primary">
              <LinkIcon size={16} />
              Conectar con Google Calendar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── AI Provider Section ──────────────────────────────────────────────────────
function AIProviderSection() {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    provider: 'OPENAI',
    apiKey: '',
    customEndpoint: '',
    customModel: '',
  })

  useEffect(() => {
    fetch('/api/agent-config')
      .then((r) => r.json())
      .then((data: AIConfig | null) => {
        if (data) {
          setConfig(data)
          setForm((f) => ({
            ...f,
            provider: data.provider,
            customEndpoint: data.customEndpoint ?? '',
            customModel: data.customModel ?? '',
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function save() {
    setSaving(true)
    await fetch('/api/agent-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.5rem',
  }

  return (
    <div className="card">
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            background: 'rgba(97,114,243,0.15)',
            border: '1px solid rgba(97,114,243,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Robot size={22} color="#6172f3" weight="duotone" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Proveedor de IA</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Activo: {config?.provider ?? 'OPENAI'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="ai-provider" style={labelStyle}>
              Proveedor
            </label>
            <select
              id="ai-provider"
              className="input"
              value={form.provider}
              onChange={update('provider')}
              style={{ cursor: 'pointer' }}
            >
              <option value="OPENAI">OpenAI (GPT-4o mini)</option>
              <option value="ANTIGRAVITY">Antigravity (Gemini)</option>
              <option value="CUSTOM">Personalizado (OpenAI-compatible)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              API Key{' '}
              {config?.hasApiKey && (
                <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>
                  Ya guardada
                </span>
              )}
            </label>
            <input
              id="ai-api-key"
              type="password"
              className="input"
              placeholder={
                config?.hasApiKey
                  ? '••••••••• (ya guardada)'
                  : `${form.provider === 'OPENAI' ? 'sk-...' : form.provider === 'ANTIGRAVITY' ? 'AIza...' : 'Clave de API'}`
              }
              value={form.apiKey}
              onChange={update('apiKey')}
            />
          </div>

          {form.provider === 'CUSTOM' && (
            <>
              <div>
                <label style={labelStyle}>Endpoint personalizado</label>
                <input
                  id="custom-endpoint"
                  type="url"
                  className="input"
                  placeholder="https://api.ejemplo.com/v1"
                  value={form.customEndpoint}
                  onChange={update('customEndpoint')}
                />
              </div>
              <div>
                <label style={labelStyle}>Modelo</label>
                <input
                  id="custom-model"
                  type="text"
                  className="input"
                  placeholder="gpt-4o, mistral-7b, etc."
                  value={form.customModel}
                  onChange={update('customModel')}
                />
              </div>
            </>
          )}

          <button
            id="save-ai-config"
            onClick={save}
            className="btn btn-primary"
            disabled={saving}
            style={{ alignSelf: 'flex-start' }}
          >
            {saving ? (
              <CircleNotch size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : saved ? (
              <CheckCircle size={16} />
            ) : (
              <FloppyDisk size={16} />
            )}
            {saved ? 'Guardado' : 'Guardar proveedor'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function IntegracionesPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Integraciones</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Conecta WhatsApp, Google Calendar y el proveedor de IA
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <WhatsAppSection />
        <GoogleCalendarSection />
        <AIProviderSection />
      </div>
    </div>
  )
}
