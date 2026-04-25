/**
 * Formatação monetária em centavos → BRL (`pt-BR`).
 * Valores no domínio são sempre `amountCents` (inteiro).
 */

/** BRL sem sinal explícito (o sinal vem do número em `toLocaleString`). */
export function formatCents(amountCents: number) {
  const value = amountCents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** `+ R$ …` / `− R$ …` com valor absoluto formatado. */
export function signedFormatCents(amountCents: number) {
  const sign = amountCents >= 0 ? "+" : "−";
  return sign + " " + formatCents(Math.abs(amountCents));
}
