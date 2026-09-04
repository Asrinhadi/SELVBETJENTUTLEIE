import { format, isValid, parseISO } from "date-fns"
import { nb } from "date-fns/locale"

/** Hardt mellomrom (U+00A0) slik at «3 910 kr» ikke brekker over linjer. */
export const NBSP = " "

/** «3 910 kr» med hardt mellomrom som tusenskille og foran «kr». */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded < 0 ? "−" : ""
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${sign}${digits}${NBSP}kr`
}

/** «lørdag 19. september 2026» */
export function formatLongDate(isoDate: string): string {
  const date = parseISO(isoDate)
  if (!isValid(date)) return "Ugyldig dato"
  return format(date, "EEEE d. MMMM yyyy", { locale: nb })
}

/** «19.09.2026» */
export function formatShortDate(isoDate: string): string {
  const date = parseISO(isoDate)
  if (!isValid(date)) return "–"
  return format(date, "dd.MM.yyyy", { locale: nb })
}

/** «19. sep. 2026 kl. 14:32» */
export function formatDateTime(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp)
  if (!isValid(date)) return "–"
  return format(date, "d. MMM yyyy 'kl.' HH:mm", { locale: nb })
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "–"
  return `kl. ${startTime}–${endTime}`
}

/** «1 t 30 min» */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 min"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} t`
  return `${h} t ${m} min`
}

/** «1 punkt» / «3 punkter» */
export function pluralPunkt(count: number): string {
  return count === 1 ? "1 punkt" : `${count} punkter`
}

export function capitalize(text: string): string {
  if (text.length === 0) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}
