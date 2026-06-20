'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  WhatsappLogo,
  SquaresFour,
  ChatTeardropDots,
  CalendarCheck,
  PaintBrush,
  Plugs,
  Robot,
  Star,
  ChartBar,
  Megaphone,
} from '@phosphor-icons/react'

const navItems = [
  { href: '/dashboard', icon: SquaresFour, label: 'Dashboard' },
  { href: '/conversaciones', icon: ChatTeardropDots, label: 'Conversaciones' },
  { href: '/citas', icon: CalendarCheck, label: 'Citas' },
  { href: '/campanas', icon: Megaphone, label: 'Campañas' },
  { href: '/analytics', icon: ChartBar, label: 'Analytics' },
  { href: '/feedback', icon: Star, label: 'Feedback & NPS' },
  { href: '/personalizacion', icon: PaintBrush, label: 'Personalización' },
  { href: '/integraciones', icon: Plugs, label: 'Integraciones' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div
        style={{
          padding: '1.5rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #6172f3 0%, #25d366 100%)',
            borderRadius: '0.625rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(97, 114, 243, 0.3)',
          }}
        >
          <WhatsappLogo size={20} color="#fff" weight="fill" />
        </div>
        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            WhatsApp Agente
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Panel de Control
          </div>
        </div>
      </div>

      {/* AI Status Badge */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(37, 211, 102, 0.08)',
            border: '1px solid rgba(37, 211, 102, 0.2)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Robot size={14} color="#25d366" weight="fill" />
          <span style={{ fontSize: '0.75rem', color: '#25d366', fontWeight: 500 }}>
            Agente IA Activo
          </span>
          <span className="status-dot status-dot-green" style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 1rem', overflowY: 'auto' }}>
        {/* Sección Principal */}
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.75rem 0 0.5rem 0.375rem',
          }}
        >
          Principal
        </div>
        {navItems.slice(0, 3).map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              {label}
            </Link>
          )
        })}

        {/* Sección Herramientas */}
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '1.25rem 0 0.5rem 0.375rem',
          }}
        >
          Herramientas
        </div>
        {navItems.slice(3, 6).map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              {label}
            </Link>
          )
        })}

        {/* Sección Ajustes */}
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '1.25rem 0 0.5rem 0.375rem',
          }}
        >
          Ajustes
        </div>
        {navItems.slice(6).map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Plan status */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(97, 114, 243, 0.02)',
        }}
      >
        <div
          style={{
            padding: '0.75rem',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Plan Enterprise
          </div>
          <div
            style={{
              fontSize: '0.6875rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Límite mensual:</span>
            <span style={{ fontWeight: 600, color: 'var(--color-whatsapp)' }}>Ilimitado</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
