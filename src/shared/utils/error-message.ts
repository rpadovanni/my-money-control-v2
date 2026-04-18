export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.'
}
