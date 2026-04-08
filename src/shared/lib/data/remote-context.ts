import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../supabase/client'
import { getAuthSession } from './auth-session'

export function requireRemote(): { client: SupabaseClient; userId: string } {
  const client = getSupabaseClient()
  const userId = getAuthSession()?.user?.id
  if (!client || !userId) {
    throw new Error('É necessário estar logado na nuvem para esta operação.')
  }
  return { client, userId }
}
