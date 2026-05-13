import { useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { SiteNavigationBar } from '../components/SiteNavigationBar'
import { useAuth } from '../contexts/AuthContext'
import { useLoginDocumentOverscroll } from '../hooks/useDocumentOverscrollShell'
import { DEFAULT_LOGIN_COUNTRY_DIAL, LOGIN_COUNTRY_DIAL_OPTIONS } from '../lib/loginDialCodes'
import { buildPhoneDigitsForLogin } from '../lib/phone'

export function LoginPage() {
  const auth = useAuth()
  const [countryDial, setCountryDial] = useState(DEFAULT_LOGIN_COUNTRY_DIAL)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const countrySelectRef = useRef<HTMLSelectElement>(null)

  useLoginDocumentOverscroll(auth.status !== 'authenticated')

  if (auth.status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  function openCountryPicker() {
    const sel = countrySelectRef.current
    if (!sel) return
    sel.focus()
    const extended = sel as HTMLSelectElement & { showPicker?: () => void }
    if (typeof extended.showPicker === 'function') {
      try {
        extended.showPicker()
      } catch {
        sel.click()
      }
    } else {
      sel.click()
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    setError(null)
    setSubmitting(true)
    try {
      await auth.login({
        phone: buildPhoneDigitsForLogin(countryDial, phone),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page login-page home-public">
      <SiteNavigationBar variant="solid" />
      <main className="login-editorial">
        <section className="login-editorial__frame" aria-labelledby="login-title">
          <h1 className="login-editorial__hero" id="login-title">
            <span className="login-editorial__hero-text">Welcome</span>
          </h1>
          <div className="login-editorial__lede">
            <p className="login-editorial__lede-line">
              Select your country code and enter your 
            </p>
            <p className="login-editorial__lede-line">
              phone number to view your invitation.
            </p>
            <p className="login-editorial__lede-line">
              Once logged in, you will be able to submit a
            </p>
            <p className="login-editorial__lede-line ">
              RSVP for yourself and anyone else in your party.
            </p>
          </div>
          <form className="login-editorial__form" onSubmit={onSubmit}>
            <div className="login-editorial__fields-row">
              <div className="login-editorial__underline-field">
                <label
                  className="login-editorial__underline-field-label"
                  htmlFor="login-country-dial"
                >
                </label>
                <div className="login-editorial__underline-line">
                  <select
                    ref={countrySelectRef}
                    id="login-country-dial"
                    name="countryDial"
                    className="login-editorial__underline-select"
                    value={countryDial}
                    onChange={(e) => setCountryDial(e.target.value)}
                  >
                    {LOGIN_COUNTRY_DIAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="login-editorial__field-chevron login-editorial__field-chevron--trigger"
                    aria-label="Open country code options"
                    onClick={() => openCountryPicker()}
                  />
                </div>
              </div>
              <label
                className="login-editorial__underline-field"
                htmlFor="login-phone"
              >
                <span className="login-editorial__underline-field-label"></span>
                <div className="login-editorial__underline-line">
                  <input
                    id="login-phone"
                    name="phone"
                    className="login-editorial__underline-input"
                    autoComplete={
                      countryDial === DEFAULT_LOGIN_COUNTRY_DIAL ? 'tel-national' : 'tel'
                    }
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={
                      countryDial === DEFAULT_LOGIN_COUNTRY_DIAL
                        ? 'Phone'
                        : 'Local phone'
                    }
                    required
                  />
                </div>
              </label>
            </div>
            {error ? (
              <p className="form-error login-editorial__error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="login-editorial__submit"
              type="submit"
              disabled={submitting || auth.status === 'loading'}
            >
              {submitting ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
