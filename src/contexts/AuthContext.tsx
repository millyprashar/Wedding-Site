import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../lib/api'
import type { GuestProfile, FamilyMember } from '../types'

const STORAGE_KEY = 'wedding_guest_id'

type AuthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'anonymous' }
  | {
      status: 'authenticated'
      guestId: string
      guest: GuestProfile
      familyMembers: FamilyMember[]
    }

type AuthContextValue = AuthState & {
  login: (p: { phone: string }) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'idle' })

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ status: 'anonymous' })
  }, [])

  const refresh = useCallback(async () => {
    const guestId = localStorage.getItem(STORAGE_KEY)
    if (!guestId) {
      setState({ status: 'anonymous' })
      return
    }
    setState({ status: 'loading' })
    try {
      const me = await api.fetchMe(guestId)
      setState({
        status: 'authenticated',
        guestId,
        guest: me.guest,
        familyMembers: me.familyMembers,
      })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setState({ status: 'anonymous' })
    }
  }, [])

  const login = useCallback(
    async (p: { phone: string }) => {
      const { guestId } = await api.login(p)
      localStorage.setItem(STORAGE_KEY, guestId)
      await refresh()
    },
    [refresh],
  )

  useEffect(() => {
    if (state.status !== 'idle') return
    void refresh()
  }, [state.status, refresh])

  const value = useMemo<AuthContextValue>(
    () =>
      ({
        ...state,
        login,
        logout,
        refresh,
      }) as AuthContextValue,
    [state, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
