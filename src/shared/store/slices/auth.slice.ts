import type { StateCreator } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { setAuthSession } from '../../lib/data/auth-session'
import { getSupabaseClient } from '../../lib/supabase/client'
import type { StoreState } from '../store-state'

declare const window: Window

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

export type AuthSlice = { auth: AuthSliceState } & AuthSliceActions

let authListenerAttached = false
let initInFlight: Promise<void> | null = null

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_resolve, reject) => {
      const id = window.setTimeout(() => reject(new Error(message)), ms)
      p.finally(() => window.clearTimeout(id)).catch(() => {
        // ignore
      })
    }),
  ])
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set) => ({
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

    const client = getSupabaseClient()
    if (!client) {
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

      try {
        const res = await withTimeout(
          client.auth.getSession(),
          8000,
          'Timeout ao verificar sessão. Verifique conexão/URL do Supabase.',
        )
        if (res.error) throw res.error

        const session = res.data.session
        setAuthSession(session)
        set((s) => ({
          ...s,
          auth: {
            ...s.auth,
            session,
            status: session ? 'signedIn' : 'signedOut',
          },
        }))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao verificar sessão.'
        setAuthSession(null)
        set((s) => ({
          ...s,
          auth: {
            ...s.auth,
            session: null,
            status: 'signedOut',
            authError: message,
          },
        }))
      } finally {
        initInFlight = null
      }

      if (!authListenerAttached) {
        authListenerAttached = true
        client.auth.onAuthStateChange((_event, nextSession) => {
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
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase não está configurado (variáveis de ambiente).')
    set((s) => ({ ...s, auth: { ...s.auth, authError: null, status: 'loading' } }))
    const { error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      set((s) => ({ ...s, auth: { ...s.auth, authError: error.message, status: 'signedOut' } }))
      throw error
    }
  },

  signUpWithPassword: async (email, password) => {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase não está configurado (variáveis de ambiente).')
    set((s) => ({ ...s, auth: { ...s.auth, authError: null } }))
    const { error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    if (error) {
      set((s) => ({ ...s, auth: { ...s.auth, authError: error.message } }))
      throw error
    }
  },

  signOut: async () => {
    const client = getSupabaseClient()
    if (client) {
      const { error } = await client.auth.signOut()
      if (error) throw new Error(error.message)
    }
    setAuthSession(null)
    set((s) => ({
      ...s,
      auth: { ...s.auth, session: null, status: 'signedOut', authError: null },
    }))
  },
})
