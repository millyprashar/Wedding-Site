import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { SiteNavigationBar } from '../components/SiteNavigationBar'
import * as api from '../lib/api'
import {
  RECEPTION_EVENT_DETAILS,
  type ReceptionEventDetails,
} from '../lib/eventMeta'
import { useAuth } from '../contexts/AuthContext'
import type { RsvpRecord } from '../types'

type AttendingChoice = boolean | null

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [rows, setRows] = useState<{ guestId: string; name: string }[]>([])
  const [choices, setChoices] = useState<Record<string, AttendingChoice>>({})
  const [savingGuestId, setSavingGuestId] = useState<string | null>(null)
  const [savedGuestId, setSavedGuestId] = useState<string | null>(null)
  const [titleMarkBroken, setTitleMarkBroken] = useState(false)
  const [additionalGuestCount, setAdditionalGuestCount] = useState(0)
  const [savedAdditionalGuestCount, setSavedAdditionalGuestCount] = useState(0)
  const [savingAdditionalGuests, setSavingAdditionalGuests] = useState(false)
  const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allowed =
    auth.status === 'authenticated' &&
    eventId &&
    auth.guest.eventIds.includes(eventId)

  const namesById = useMemo(() => {
    const m = new Map<string, string>()
    if (auth.status === 'authenticated') {
      for (const f of auth.familyMembers) {
        m.set(f.id, `${f.firstName} ${f.lastName}`)
      }
    }
    return m
  }, [auth])

  const additionalGuestsByGuestId = useMemo(() => {
    const m = new Map<string, number>()
    if (auth.status === 'authenticated' && eventId) {
      for (const f of auth.familyMembers) {
        const confirmed = f.additionalGuestsConfirmedByEvent[eventId] ?? 0
        if (confirmed > 0) m.set(f.id, confirmed)
      }
      if (savedAdditionalGuestCount > 0) {
        m.set(auth.guestId, savedAdditionalGuestCount)
      } else {
        m.delete(auth.guestId)
      }
    }
    return m
  }, [auth, eventId, savedAdditionalGuestCount])

  useEffect(() => {
    if (auth.status !== 'authenticated' || !eventId || !allowed) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSavedGuestId(null)
    api
      .fetchEvent(auth.guestId, eventId)
      .then((d) => {
        if (cancelled) return
        setEventTitle(d.event.title)
        const nextChoices: Record<string, AttendingChoice> = {}
        const list: { guestId: string; name: string }[] = []
        for (const r of d.rsvps as RsvpRecord[]) {
          const name = namesById.get(r.guestId) ?? 'Guest'
          list.push({ guestId: r.guestId, name })
          if (r.status === 'attending') nextChoices[r.guestId] = true
          else if (r.status === 'declined') nextChoices[r.guestId] = false
          else nextChoices[r.guestId] = null
        }
        setRows(list)
        setChoices(nextChoices)
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load event')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [auth, eventId, allowed, namesById])

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current)
    }
  }, [])

  useEffect(() => {
    setTitleMarkBroken(false)
  }, [eventId])

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      setAdditionalGuestCount(0)
      setSavedAdditionalGuestCount(0)
      return
    }

    const confirmed = eventId
      ? (auth.guest.additionalGuestsConfirmedByEvent[eventId] ?? 0)
      : 0
    setAdditionalGuestCount(confirmed)
    setSavedAdditionalGuestCount(confirmed)
  }, [auth, eventId])

  if (auth.status === 'idle' || auth.status === 'loading') {
    return (
      <div className="page home-public">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (auth.status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: `/events/${eventId}` } }}
      />
    )
  }

  if (!eventId) {
    return <Navigate to="/" replace />
  }

  if (!allowed) {
    return (
      <div className="page home-public">
        <SiteNavigationBar variant="solid" />
        <main className="narrow">
          <h1>Not invited to this event</h1>
          <p className="lede">
            Your invitation does not include this event. If you think that is a
            mistake, please reach out to us directly.
          </p>
          <Link to="/">Back to home</Link>
        </main>
      </div>
    )
  }

  if (loading && rows.length === 0) {
    return (
      <div className="page home-public">
        <SiteNavigationBar variant="solid" />
        <main className="narrow">
          <p className="muted">Loading event…</p>
        </main>
      </div>
    )
  }

  if (error || (!loading && rows.length === 0)) {
    return (
      <div className="page home-public">
        <SiteNavigationBar variant="solid" />
        <main className="narrow">
          <p className="form-error">{error ?? 'Something went wrong.'}</p>
          <Link to="/">Back to home</Link>
        </main>
      </div>
    )
  }

  async function handleRsvpChoice(guestId: string, attending: boolean) {
    if (choices[guestId] === attending) return
    if (!eventId || auth.status !== 'authenticated') return
    const previous = choices[guestId] ?? null
    setChoices((c) => ({ ...c, [guestId]: attending }))
    setError(null)
    setSavedGuestId(null)
    if (saveMessageTimer.current) {
      clearTimeout(saveMessageTimer.current)
      saveMessageTimer.current = null
    }
    setSavingGuestId(guestId)
    try {
      await api.submitReceptionRsvps(auth.guestId, eventId, [
        { guestId, attending },
      ])
      setSavedGuestId(guestId)
      saveMessageTimer.current = setTimeout(() => {
        setSavedGuestId(null)
        saveMessageTimer.current = null
      }, 2200)
    } catch (err) {
      setChoices((c) => ({ ...c, [guestId]: previous }))
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSavingGuestId(null)
    }
  }

  async function persistAdditionalGuestCount(nextCount: number) {
    if (auth.status !== 'authenticated' || !eventId) return
    if (nextCount === savedAdditionalGuestCount) return

    setSavingAdditionalGuests(true)
    setError(null)
    try {
      await api.submitAdditionalGuestsConfirmed(
        auth.guestId,
        eventId,
        nextCount,
      )
      setSavedAdditionalGuestCount(nextCount)
    } catch (err) {
      setAdditionalGuestCount(savedAdditionalGuestCount)
      setError(err instanceof Error ? err.message : 'Could not save additional guests')
    } finally {
      setSavingAdditionalGuests(false)
    }
  }

  const details = eventId ? RECEPTION_EVENT_DETAILS[eventId] : undefined
  const displayTitle = eventTitle || details?.title || 'Event'
  const additionalGuestsAllowed =
    auth.status === 'authenticated' && eventId
      ? (auth.guest.additionalGuestsAllowedByEvent[eventId] ?? 0)
      : 0
  const confirmedByOtherFamilyMembers =
    auth.status === 'authenticated' && eventId
      ? auth.familyMembers.reduce(
          (total, member) =>
            member.id === auth.guestId
              ? total
              : total + (member.additionalGuestsConfirmedByEvent[eventId] ?? 0),
          0,
        )
      : 0
  const additionalGuestCap = Math.max(
    0,
    additionalGuestsAllowed - confirmedByOtherFamilyMembers,
  )
  const additionalGuestsRemaining = Math.max(
    0,
    additionalGuestCap - additionalGuestCount,
  )
  if (!details) {
    return (
      <div className="page home-public">
        <SiteNavigationBar variant="solid" />
        <main className="narrow">
          <h1>{displayTitle}</h1>
          <p className="lede">
            Details for this event are not available here yet. Please check
            back or contact the hosts.
          </p>
          <Link to="/">Back to home</Link>
        </main>
      </div>
    )
  }

  return (
    <div
      className={`page home-public event-page${
        eventId === 'reception-rahman' ? ' event-page--valima' : ''
      }`}
    >
      <SiteNavigationBar variant="solid" />

      <main className="event-page-main">
        <EventEditorialDetails
          details={details}
          displayTitle={displayTitle}
          eventId={eventId}
          titleMarkBroken={titleMarkBroken}
          onTitleMarkError={() => setTitleMarkBroken(true)}
        />

        <section
          className="rsvp-section--editorial"
          aria-labelledby="rsvp-hero-label"
        >
          <div className="rsvp-editorial__inner">
            <div className="rsvp-editorial__frame">
              <h2 className="rsvp-editorial__hero" id="rsvp-hero-label">
                <span className="rsvp-editorial__hero-text">RSVP</span>
              </h2>
              <div className="rsvp-editorial__lede">
                <p className="rsvp-editorial__lede-line">
                  Please select a response for each
                </p>
                <p className="rsvp-editorial__lede-line">
                  guest in your group by July 10th 2026.
                </p>
                <p className="rsvp-editorial__lede-line">
                </p>
              </div>
              <ul className="rsvp-editorial__list">
                {rows.map((r) => {
                  const choice = choices[r.guestId]
                  const rowBusy = savingGuestId === r.guestId
                  const additionalGuestCountForRow =
                    additionalGuestsByGuestId.get(r.guestId) ?? 0
                  return (
                    <li
                      key={r.guestId}
                      className="rsvp-editorial__row"
                      aria-busy={rowBusy}
                    >
                      <div className="rsvp-editorial__namecell">
                        <span className="rsvp-editorial__name">{r.name}</span>
                        {additionalGuestCountForRow > 0 ? (
                          <span
                            className="rsvp-editorial__additional-count"
                            aria-label={`${additionalGuestCountForRow} additional ${
                              additionalGuestCountForRow === 1 ? 'guest' : 'guests'
                            }`}
                          >
                            +{additionalGuestCountForRow}
                          </span>
                        ) : null}
                        {rowBusy ? (
                          <span className="rsvp-editorial__saving" aria-live="polite">
                            Saving…
                          </span>
                        ) : savedGuestId === r.guestId ? (
                          <span className="rsvp-editorial__saving" role="status" aria-live="polite">
                            Saved
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="rsvp-editorial__actions"
                        role="group"
                        aria-label={`RSVP for ${r.name}`}
                      >
                        <button
                          type="button"
                          className={`rsvp-pill rsvp-pill--yes ${
                            choice === true ? 'rsvp-pill--selected' : ''
                          }`}
                          onClick={() => void handleRsvpChoice(r.guestId, true)}
                          disabled={rowBusy}
                          aria-pressed={choice === true}
                        >
                          Yes I will be there!
                        </button>
                        <button
                          type="button"
                          className={`rsvp-pill rsvp-pill--no ${
                            choice === false ? 'rsvp-pill--selected' : ''
                          }`}
                          onClick={() => void handleRsvpChoice(r.guestId, false)}
                          disabled={rowBusy}
                          aria-pressed={choice === false}
                        >
                          {"Sadly can't make it."}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {additionalGuestsAllowed > 0 ? (
                <div
                  className="rsvp-additional-guests"
                  aria-labelledby="rsvp-additional-guests-label"
                  aria-describedby="rsvp-additional-guests-note"
                >
                  {/* <p
                    className="rsvp-additional-guests__label"
                    id="rsvp-additional-guests-label"
                  >
                    Additional Guests
                  </p> */}
                  <p className="rsvp-additional-guests__note" id="rsvp-additional-guests-note">
                    Your group can add up to {additionalGuestsAllowed}{' '}
                    additional {additionalGuestsAllowed === 1 ? 'guest' : 'guests'}.
                  </p>
                  <div className="rsvp-additional-guests__stepper">
                    <button
                      type="button"
                      className="rsvp-additional-guests__btn"
                      aria-label="Decrease additional guests"
                      disabled={savingAdditionalGuests || additionalGuestCount <= 0}
                      onClick={() => {
                        const next = Math.max(0, additionalGuestCount - 1)
                        if (next === additionalGuestCount) return
                        setAdditionalGuestCount(next)
                        void persistAdditionalGuestCount(next)
                      }}
                    >
                      −
                    </button>
                    <span
                      className="rsvp-additional-guests__value"
                      aria-live="polite"
                    >
                      {additionalGuestCount}
                    </span>
                    <button
                      type="button"
                      className="rsvp-additional-guests__btn"
                      aria-label="Increase additional guests"
                      disabled={
                        savingAdditionalGuests ||
                        additionalGuestCount >= additionalGuestCap
                      }
                      onClick={() => {
                        const next = Math.min(
                          additionalGuestCap,
                          additionalGuestCount + 1,
                        )
                        if (next === additionalGuestCount) return
                        setAdditionalGuestCount(next)
                        void persistAdditionalGuestCount(next)
                      }}
                    >
                      +
                    </button>
                  </div>
                  <p className="rsvp-additional-guests__remaining" aria-live="polite">
                    {additionalGuestsRemaining}{' '}
                    additional {additionalGuestsRemaining === 1 ? 'guest' : 'guests'}{' '}
                    remaining for your group.
                  </p>
                </div>
              ) : null}
              {error ? (
                <p className="form-error rsvp-editorial__form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function EventEditorialDetails({
  details,
  displayTitle,
  eventId,
  titleMarkBroken,
  onTitleMarkError,
}: {
  details: ReceptionEventDetails
  displayTitle: string
  eventId: string
  titleMarkBroken: boolean
  onTitleMarkError: () => void
}) {
  const columnImg = details.landingLeftImage
  const eveningCopy = details.eveningDescription

  return (
    <section className="event-details-editorial" aria-labelledby="event-editorial-title">
      <div className="event-details-editorial__inner">
        <div className="event-details-editorial__grid">
          <header className="event-page-title-wrap">
            <h1 className="event-page-title" id="event-editorial-title">
              {!titleMarkBroken ? (
                <span
                  className={`event-page-title__mark-wrap event-page-title__mark-wrap--${
                    eventId === 'reception-prashar' ? 'prashar' : 'rahman'
                  }`}
                >
                  <img
                    src={details.titleMarkSrc}
                    alt={displayTitle}
                    className="event-page-title__mark"
                    onError={onTitleMarkError}
                  />
                </span>
              ) : (
                <span className="event-page-title__fallback">{displayTitle}</span>
              )}
            </h1>
          </header>
          <aside className="event-details-editorial__left">
            {/* <h2 className="event-details-editorial__section-title" id="event-editorial-title">
              Event Details
            </h2> */}
            <figure
              className={`event-details-editorial__figure event-details-editorial__figure--${
                eventId === 'reception-prashar' ? 'prashar' : 'rahman'
              }`}
            >
              <img
                src={columnImg}
                alt={displayTitle}
              />
            </figure>
            {/* <p className="event-details-editorial__sub">{details.hostedByLine}</p> */}
          </aside>

          <div className="event-details-editorial__right">
            <article className="event-details-pair">
              <h2 className="event-details-pair__title" id="event-editorial-when">
                <span className="event-details-pair__the">The</span>
                <span className="event-details-pair__label"> when & where</span>
              </h2>
              <div className="event-details-pair__body">
                <p>
                  {formatEventDay(details.dateIso)}
                  <span className="event-details-pair__datetime-sep"> at </span>
                  {details.startTimeLabel}
                </p>
                <p>
                  <strong className="event-details-pair__strong">
                    {details.venueName}
                  </strong>
                  {details.addressLines.length > 0 ? (
                    <>
                      {details.addressLines.map((line) => (
                        <span key={line}>
                          <br />
                          {line}
                        </span>
                      ))}
                    </>
                  ) : null}
                </p>
              </div>
            </article>

            <article className="event-details-pair">
              <h2 className="event-details-pair__title" id="event-editorial-evening">
                <span className="event-details-pair__the">The</span>
                <span className="event-details-pair__label"> evening</span>
              </h2>
              <div className="event-details-pair__body">
                <p className="event-details-pair__prose">{eveningCopy}</p>
              </div>
            </article>

            <article className="event-details-pair">
              <h2 className="event-details-pair__title" id="event-editorial-dress">
                <span className="event-details-pair__the">The</span>
                <span className="event-details-pair__label"> dress code</span>
              </h2>
              <div className="event-details-pair__body">
                <p className="event-details-pair__prose">{details.attire}</p>
              </div>
            </article>

            <article className="event-details-pair event-details-pair--last">
              <h2 className="event-details-pair__title" id="event-editorial-gifting">
                <span className="event-details-pair__the">The</span>
                <span className="event-details-pair__label"> gifting policy</span>
              </h2>
              <div className="event-details-pair__body">
                <p className="event-details-pair__prose">
                  As we begin this new chapter together, your presence at our
                  celebration is truly the greatest gift. For those who wish to
                  honor us further, we kindly request no boxed gifts – written cards and cash are appriciated!
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

function formatEventDay(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
