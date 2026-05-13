import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNavigationBar } from '../components/SiteNavigationBar'
import { RECEPTION_EVENT_LABELS } from '../lib/eventMeta'
import { useAuth } from '../contexts/AuthContext'
import type { GuestProfile } from '../types'

const IMG = {
  guestInfoBg: '/images/palace.JPG',
  loveStory: '/images/love-story.png',
  names: '/images/names.svg',
} as const

const SIGNED_OUT_HERO_PHOTO_STRIPS = [
  '/images/blackAndWhitePhotoStrip.jpeg',
  '/images/coloredPhotoStrip.jpeg',
] as const

const SIGNED_OUT_HERO_SCROLL_SEQUENCE = [
  ...SIGNED_OUT_HERO_PHOTO_STRIPS,
  ...SIGNED_OUT_HERO_PHOTO_STRIPS,
]

const SIGNED_IN_COLLAGE_TILES = [
  {src: '/images/dupattaOverOurHead.jpg', alt: '', className: 'tile-a',},
  { src: '/images/sunglasses.jpg', alt: '', className: 'tile-b' },
  { src: '/images/bench.jpg', alt: '', className: 'tile-c' },
  { src: '/images/oakland3.JPG', alt: '', className: 'tile-d' },
  { src: '/images/headOnShoulderAlamoSquare.JPG', alt: '', className: 'tile-e' },
  { src: '/images/palace.JPG', alt: '', className: 'tile-f' },
] as const

const SIGNED_IN_HOME_PRELOAD_SRCS: readonly string[] = [
  IMG.names,
  '/images/oakland1.JPG',
  ...SIGNED_IN_COLLAGE_TILES.map((t) => t.src),
]

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

/** Mount with `key={guestId}` so each login resets preload state without empty collage flash. */
function HomeMemberView({ guest }: { guest: GuestProfile }) {
  const [namesMarkBroken, setNamesMarkBroken] = useState(false)
  const [visualReady, setVisualReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all(SIGNED_IN_HOME_PRELOAD_SRCS.map(preloadImage)).then(() => {
      if (!cancelled) setVisualReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!visualReady) {
    return (
      <div className="page home-public home-member">
        <SiteNavigationBar variant="solid" />
        <main
          className="home-member-main home-member-main--preload"
          aria-busy="true"
        >
          <p className="muted home-loading">Loading…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="page home-public home-member">
      <SiteNavigationBar variant="solid" />

      <main className="home-member-main">
        <section className="home-member-editorial" aria-label="Welcome">
          <h1 className="home-member-editorial-title">
            {!namesMarkBroken ? (
              <img
                src={IMG.names}
                alt="Milly & Tariq"
                className="home-names-mark home-names-mark--editorial"
                onError={() => setNamesMarkBroken(true)}
              />
            ) : (
              <span className="home-names-fallback home-names-fallback--editorial">
                Milly & Tariq
              </span>
            )}
          </h1>
          <div className="home-member-collage-stage">
            <figure className="home-member-collage-main">
              <img src="/images/oakland1.JPG" alt="Milly and Tariq" />
            </figure>
            {SIGNED_IN_COLLAGE_TILES.map((tile) => (
              <figure
                key={tile.className}
                className={`home-member-collage-tile ${tile.className}`}
              >
                <img src={tile.src} alt={tile.alt} />
              </figure>
            ))}
          </div>
        </section>

        <section className="home-member-welcome" aria-labelledby="signed-in-event-hint">
          <p className="home-member-hint" id="signed-in-event-hint">
            Select an event
          </p>
          {guest.eventIds.length > 0 ? (
            <ul
              className="home-member-event-list"
              aria-labelledby="signed-in-event-hint"
            >
              {guest.eventIds.map((id) => {
                const path = `/events/${id}`
                const label = RECEPTION_EVENT_LABELS[id] ?? id
                return (
                  <li key={id}>
                    <Link to={path} className="home-member-event-link">
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="home-member-no-events muted">
              Your event links will show here once your invitation includes them.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export function HomePage() {
  const auth = useAuth()
  const [namesMarkBroken, setNamesMarkBroken] = useState(false)

  useEffect(() => {
    if (auth.status !== 'anonymous') return

    void Promise.all(SIGNED_OUT_HERO_PHOTO_STRIPS.map(preloadImage))
  }, [auth.status])

  if (auth.status === 'loading' || auth.status === 'idle') {
    return (
      <div className="page home-public">
        <p className="muted home-loading">Loading…</p>
      </div>
    )
  }

  if (auth.status === 'authenticated') {
    return <HomeMemberView key={auth.guestId} guest={auth.guest} />
  }

  return (
    <div className="page home-public home-landing">
      <SiteNavigationBar
        variant="solid"
        anonymousTrailing={
          <Link to="/login" className="site-nav-ghost-link">
            RSVP
          </Link>
        }
      />

      <main className="home-landing-main">
        <section className="home-landing-hero" aria-label="Welcome">
          <div className="home-landing-hero-inner">
            <div className="home-landing-hero-headline-group">
              <p className="home-landing-hero-line home-landing-hero-line--lede">
                <span className="home-landing-hero-lede__start">Join us</span>
                <span className="home-landing-hero-lede__end">in celebrating</span>
              </p>
              <p className="home-landing-hero-line home-landing-hero-line--wedding">
                The Wedding Of
              </p>
            </div>
            <div className="home-landing-hero-photo-row">
              <span className="home-landing-hero-side-label">August</span>
              <figure className="home-landing-hero-figure">
                <div className="home-landing-hero-photo-track" aria-hidden="true">
                  {SIGNED_OUT_HERO_SCROLL_SEQUENCE.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt=""
                      className="home-landing-hero-photo"
                    />
                  ))}
                </div>
                <span className="sr-only">Milly and Tariq photo booth strips</span>
              </figure>
              <span className="home-landing-hero-side-label">2026</span>
            </div>
            <h1 className="home-landing-hero-names">
              {!namesMarkBroken ? (
                <img
                  src={IMG.names}
                  alt="Milly & Tariq"
                  className="home-names-mark home-names-mark--landing"
                  onError={() => setNamesMarkBroken(true)}
                />
              ) : (
                <span className="home-names-fallback home-names-fallback--landing">
                  Milly & Tariq
                </span>
              )}
            </h1>
          </div>
        </section>

        <section
          id="guest-info"
          className="home-guest-info"
          aria-label="Guest information"
        >
          <div
            className="home-guest-info-bg"
            style={{ backgroundImage: `url(${IMG.guestInfoBg})` }}
            role="presentation"
          />
          <div className="home-guest-info-scrim" aria-hidden />
          <div className="home-guest-info-inner">
            <p className="home-guest-info-text">
              Click 'RSVP' below to sign in and view your invitation!
            </p>
            <Link to="/login" className="home-guest-info-rsvp">
              <span className="home-guest-info-rsvp-text">R S V P</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
