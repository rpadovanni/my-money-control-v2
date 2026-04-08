import type { Session } from '@supabase/supabase-js'

let session: Session | null = null

export function setAuthSession(next: Session | null): void {
  session = next
}

export function getAuthSession(): Session | null {
  return session
}
