import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { RECEPTION_EVENT_LABELS } from '../lib/eventMeta'

export type SiteNavigationBarVariant = 'solid'

type SiteNavigationBarProps = {
  variant?: SiteNavigationBarVariant
  /** Shown on the right when the visitor is not signed in (e.g. home page links). */
  anonymousTrailing?: ReactNode
}

export function SiteNavigationBar({
  variant = 'solid',
  anonymousTrailing,
}: SiteNavigationBarProps) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading' || auth.status === 'idle') {
    return null
  }

  if (auth.status === 'anonymous') {
    return (
      <header
        className={`site-nav-bar site-nav-bar--anonymous site-nav-bar--${variant}`}
      >
        <Link to="/" className="site-nav-brand site-nav-brand--display">
          {'M + T'}
        </Link>
        {anonymousTrailing ? (
          <nav className="site-nav-bar__public" aria-label="Primary">
            {anonymousTrailing}
          </nav>
        ) : null}
      </header>
    )
  }

  return (
    <header
      className={`site-nav-bar site-nav-bar--signed-in site-nav-bar--${variant}`}
    >
      <Link to="/" className="site-nav-brand site-nav-brand--display">
        {'M + T'}
      </Link>
      <nav className="header-event-nav" aria-label="Your events">
        {auth.guest.eventIds.map((id) => {
          const path = `/events/${id}`
          const active = location.pathname === path
          const label = RECEPTION_EVENT_LABELS[id] ?? id
          return (
            <Link
              key={id}
              to={path}
              className="header-event-link"
              aria-current={active ? 'page' : undefined}
            >
              <span className="header-event-link__label">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="header-actions">
        <button
          type="button"
          className="button ghost nav-bar-action"
          onClick={auth.logout}
        >
          <span className="nav-bar-action__label">Sign out</span>
        </button>
      </div>
    </header>
  )
}
