export function formatCents(cents: number) {
  const value = cents / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function signedFormatCents(cents: number) {
  const sign = cents >= 0 ? '+' : '−'
  return sign + ' ' + formatCents(Math.abs(cents))
}
