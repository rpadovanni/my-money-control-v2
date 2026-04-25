/**
 * Regras puras (sem IO) relacionadas a categorias.
 *
 * Importante: o domínio assume que `CategoryRecord.type` é sempre persistido.
 * Não mantemos mais lógica de inferência para bases legadas em runtime.
 */

/**
 * Gera um slug ASCII determinístico a partir do label da categoria. Usado para
 * compor IDs estáveis em ambas as persistências (Dexie e Supabase). Sem deps
 * externas, depende apenas de `String.prototype.normalize` (NFD).
 */
export function slugFromCategoryLabel(label: string): string {
  const n = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return n.length > 0 ? n : 'categoria'
}
