import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../shared/lib/supabase/client'

declare const window: Window

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

export function hasSupabaseAuthClient(): boolean {
  return getSupabaseClient() != null
}

/** Sessão atual ou erro; sem cliente configurado devolve sessão nula sem erro. */
export async function getSessionWithTimeout(
  timeoutMs: number,
  timeoutMessage: string,
): Promise<{ session: Session | null; error: Error | null }> {
  const client = getSupabaseClient()
  if (!client) return { session: null, error: null }

  try {
    const res = await withTimeout(client.auth.getSession(), timeoutMs, timeoutMessage)
    if (res.error) return { session: null, error: res.error as Error }
    return { session: res.data.session, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao verificar sessão.'
    return { session: null, error: new Error(message) }
  }
}

/** `unsubscribe` vazio se não houver cliente. */
export function subscribeAuthStateChange(onSession: (session: Session | null) => void): () => void {
  const client = getSupabaseClient()
  if (!client) return () => {}

  const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
    onSession(nextSession)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}

export async function signInWithPasswordApi(email: string, password: string) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase não está configurado (variáveis de ambiente).')
  return client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
}

export async function signUpWithPasswordApi(email: string, password: string) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase não está configurado (variáveis de ambiente).')
  return client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })
}

export async function signOutApi(): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return
  const { error } = await client.auth.signOut()
  if (error) throw new Error(error.message)
}
