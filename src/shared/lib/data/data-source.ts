import { getSupabaseClient } from '../supabase/client'
import { getAuthSession } from './auth-session'

/** Dados na nuvem (Postgres) quando há projeto configurado e sessão ativa. */
export function isRemoteActive(): boolean {
  return Boolean(getSupabaseClient() && getAuthSession()?.user?.id)
}
