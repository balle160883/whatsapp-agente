'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WhatsappLogo, EnvelopeSimple, Lock, ArrowRight, CircleNotch } from '@phosphor-icons/react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 20% 50%, rgba(97, 114, 243, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(37, 211, 102, 0.05) 0%, transparent 50%), #0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #6172f3 0%, #25d366 100%)',
              borderRadius: '1rem',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 32px rgba(97, 114, 243, 0.35)',
            }}
          >
            <WhatsappLogo size={32} color="#fff" weight="fill" />
          </div>
          <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            WhatsApp Agente
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              marginTop: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            Inicia sesión en tu panel de control
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.5rem',
                }}
              >
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <EnvelopeSimple
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
                  id="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.5rem',
                }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
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
                  id="password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
            >
              {loading ? (
                <CircleNotch size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            ¿No tienes cuenta?{' '}
            <Link
              href="/signup"
              style={{ color: '#8098f9', textDecoration: 'none', fontWeight: 500 }}
            >
              Regístrate gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
