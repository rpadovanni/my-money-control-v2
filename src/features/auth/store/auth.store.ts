import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { setAuthSession } from '../../../shared/lib/data/auth-session'
import {
  getSessionWithTimeout,
  hasSupabaseAuthClient,
  signInWithPasswordApi,
  signOutApi,
  signUpWithPasswordApi,
  subscribeAuthStateChange,
} from '../services/auth.supabase'

export type AuthStatus = 'idle' | 'loading' | 'signedIn' | 'signedOut'

export interface AuthSliceState {
  status: AuthStatus
  session: Session | null
  authError: string | null
}

export interface AuthSliceActions {
  initAuth: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearAuthError: () => void
}

export type AuthStore = { auth: AuthSliceState } & AuthSliceActions

let authListenerAttached = false
let initInFlight: Promise<void> | null = null

export const useAuthStore = create<AuthStore>()((set) => ({
  auth: {
    status: 'idle',
    session: null,
    authError: null,
  },

  clearAuthError: () => {
    set((s) => ({ ...s, auth: { ...s.auth, authError: null } }))
  },

  initAuth: async () => {
    if (initInFlight) return await initInFlight

    if (!hasSupabaseAuthClient()) {
      setAuthSession(null)
      set((s) => ({
        ...s,
        auth: { ...s.auth, status: 'signedOut', session: null, authError: null },
      }))
      return
    }

    initInFlight = (async () => {
      set((s) => ({
        ...s,
        auth: { ...s.auth, status: 'loading', authError: null },
      }))

      const { session, error } = await getSessionWithTimeout(
        8000,
        'Timeout ao verificar sessão. Verifique conexão/URL do Supabase.',
      )

      if (error) {
        setAuthSession(null)
        set((s) => ({
          ...s,
          auth: {
            ...s.auth,
            session: null,
            status: 'signedOut',
            authError: error.message,
          },
        }))
      } else {
        setAuthSession(session)
        set((s) => ({
          ...s,
          auth: {
            ...s.auth,
            session,
            status: session ? 'signedIn' : 'signedOut',
          },
        }))
      }

      initInFlight = null

      if (!authListenerAttached) {
        authListenerAttached = true
        subscribeAuthStateChange((nextSession) => {
          setAuthSession(nextSession)
          set((s) => ({
            ...s,
            auth: {
              ...s.auth,
              session: nextSession,
              status: nextSession ? 'signedIn' : 'signedOut',
            },
          }))
        })
      }
    })()

    return await initInFlight
  },

  signInWithPassword: async (email, password) => {
    set((s) => ({ ...s, auth: { ...s.auth, authError: null, status: 'loading' } }))
    const { data, error } = await signInWithPasswordApi(email, password)
    if (error) {
      set((s) => ({ ...s, auth: { ...s.auth, authError: error.message, status: 'signedOut' } }))
      throw error
    }
    const session = data.session
    setAuthSession(session)
    set((s) => ({
      ...s,
      auth: {
        ...s.auth,
        session,
        status: session ? 'signedIn' : 'signedOut',
        authError: null,
      },
    }))
  },

  signUpWithPassword: async (email, password) => {
    set((s) => ({ ...s, auth: { ...s.auth, authError: null } }))
    const { error } = await signUpWithPasswordApi(email, password)
    if (error) {
      set((s) => ({ ...s, auth: { ...s.auth, authError: error.message } }))
      throw error
    }
  },

  signOut: async () => {
    await signOutApi()
    setAuthSession(null)
    set((s) => ({
      ...s,
      auth: { ...s.auth, session: null, status: 'signedOut', authError: null },
    }))
  },
}))
