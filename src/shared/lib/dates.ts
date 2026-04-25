/**
 * Utilitários de data no calendário civil local (`YYYY-MM-DD`, `YYYY-MM`) e
 * formatação para UI (pt-BR via date-fns).
 */
import {
  endOfMonth,
  format,
  formatISO,
  isToday,
  isYesterday,
  parse,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Timestamps e “hoje” ---

/** ISO 8601 completo (fusos locais), p.ex. `createdAt` / `updatedAt`. */
export function nowTimestampISO(): string {
  return formatISO(new Date(), { representation: "complete" });
}

/** Data civil local no domínio (`YYYY-MM-DD`). */
export function todayISODate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Mês corrente no filtro do domínio (`YYYY-MM`). */
export function currentMonthYYYYMM(): string {
  return format(new Date(), "yyyy-MM");
}

// --- Intervalos por mês ---

/** Primeiro e último dia do mês `YYYY-MM` (calendário local). */
export function monthDayBounds(monthYYYYMM: string): {
  startISO: string;
  endISO: string;
} {
  const ref = parse(monthYYYYMM, "yyyy-MM", new Date());
  return {
    startISO: format(startOfMonth(ref), "yyyy-MM-dd"),
    endISO: format(endOfMonth(ref), "yyyy-MM-dd"),
  };
}

// --- Exibição ---

/** `YYYY-MM-DD` → texto para o utilizador (`dd/MM/yyyy`). */
export function formatISODateForDisplay(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy", { locale: ptBR });
}

/** Lista / subtítulo: `Hoje`, `Ontem` ou `dd/MM/yyyy`. */
export function formatRelativeDay(dateYYYYMMDD: string): string {
  const day = parse(dateYYYYMMDD, "yyyy-MM-dd", new Date());
  if (isToday(day)) return "Hoje";
  if (isYesterday(day)) return "Ontem";
  return format(day, "dd/MM/yyyy", { locale: ptBR });
}

/** Seletor de mês: `YYYY-MM` → texto legível. */
export function formatMonthYearForDisplay(monthYYYYMM: string): string {
  const ref = parse(monthYYYYMM, "yyyy-MM", new Date());
  return format(ref, "MMMM 'de' yyyy", { locale: ptBR });
}
