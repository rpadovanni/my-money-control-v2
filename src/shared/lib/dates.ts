import { endOfMonth, format, formatISO, parse, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Marcação de tempo ISO 8601 (fuso local), para `createdAt` / `updatedAt`. */
export function nowTimestampISO(): string {
  return formatISO(new Date(), { representation: 'complete' })
}

/** Data civil local no domínio (`YYYY-MM-DD`). */
export function todayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Mês corrente no filtro do domínio (`YYYY-MM`). */
export function currentMonthYYYYMM(): string {
  return format(new Date(), 'yyyy-MM')
}

/** Primeiro e último dia do mês `YYYY-MM` (calendário local). */
export function monthDayBounds(monthYYYYMM: string): { startISO: string; endISO: string } {
  const ref = parse(monthYYYYMM, 'yyyy-MM', new Date())
  return {
    startISO: format(startOfMonth(ref), 'yyyy-MM-dd'),
    endISO: format(endOfMonth(ref), 'yyyy-MM-dd'),
  }
}

/** Exibe `YYYY-MM-DD` para o usuário. */
export function formatISODateForDisplay(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR })
}

/** Rótulo legível para o seletor de mês (`YYYY-MM`). */
export function formatMonthYearForDisplay(monthYYYYMM: string): string {
  const ref = parse(monthYYYYMM, 'yyyy-MM', new Date())
  return format(ref, "MMMM 'de' yyyy", { locale: ptBR })
}
