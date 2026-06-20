'use client'

import { useState } from 'react'
import { Bell, SignOut, CaretRight, Robot } from '@phosphor-icons/react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Generar breadcrumbs a partir del pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    return paths.map((path, idx) => {
      const label = path.charAt(0).toUpperCase() + path.slice(1)
      const href = '/' + paths.slice(0, idx + 1).join('/')
      return { label, href }
    })
  }

  const breadcrumbs = getBreadcrumbs()

  // Iniciales del usuario para el avatar
  const getInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <header className="topbar">
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
        <span
          style={{
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Robot size={14} /> WhatsApp Agente
        </span>
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CaretRight size={10} color="var(--color-text-muted)" />
            <span
              style={{
                fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                color:
                  idx === breadcrumbs.length - 1
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
              }}
            >
              {crumb.label === 'Dashboard' ? 'Inicio' : crumb.label}
            </span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Notificaciones */}
        <button
          className="has-tooltip"
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Bell size={20} />
          <span className="tooltip">Notificaciones</span>
        </button>

        {/* Perfil Usuario */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6172f3 0%, #25d366 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(97, 114, 243, 0.25)',
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {user?.name || 'Usuario'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                {user?.role === 'ADMIN' ? 'Administrador' : 'Agente'}
              </span>
            </div>
          </button>

          {/* Menú Desplegable */}
          {dropdownOpen && (
            <>
              <div
                onClick={() => setDropdownOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              />
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: 200,
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.5rem',
                  boxShadow: 'var(--shadow-elevated)',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    color: '#ef4444',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <SignOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
