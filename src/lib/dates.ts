import { formatISO } from "date-fns"

/** ISO-dato (yyyy-MM-dd) i lokal tid. */
export function toIsoDate(date: Date): string {
  return formatISO(date, { representation: "date" })
}

/** Dagens dato som ISO-dato, beregnet i det den kalles – aldri hardkodet. */
export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

/**
 * Sann hvis `isoDate` ligger før `todayIso`. Begge må være gyldige
 * yyyy-MM-dd-strenger; da er leksikalsk sammenligning korrekt.
 */
export function isBeforeDay(isoDate: string, todayIso: string): boolean {
  return isoDate < todayIso
}
