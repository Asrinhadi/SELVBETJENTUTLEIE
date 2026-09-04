const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const MINUTES_PER_DAY = 24 * 60
/** Lengste arrangement som kan registreres uten manuell avklaring. */
export const MAX_EVENT_MINUTES = 12 * 60

/** «HH:mm» til minutter etter midnatt. Null ved ugyldig format. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** Minutter til «HH:mm». Verdier utenfor døgnet brytes ned til klokkeslett. */
export function minutesToTime(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Varighet i minutter. Sluttid før starttid tolkes som neste døgn, slik at
 * julenattmesse og nyttårsarrangementer kan registreres.
 * Null ved ugyldig format eller når start og slutt er like.
 */
export function durationMinutes(startTime: string, endTime: string): number | null {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null || start === end) return null
  const raw = end - start
  return raw > 0 ? raw : raw + MINUTES_PER_DAY
}

/** Sann når arrangementet går over midnatt. */
export function crossesMidnight(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null) return false
  return end < start
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return durationMinutes(startTime, endTime) !== null
}

/** Varighet i timer, som desimaltall. */
export function durationHours(startTime: string, endTime: string): number {
  const minutes = durationMinutes(startTime, endTime)
  return minutes === null ? 0 : minutes / 60
}

/**
 * Ukedag uten tidssoneforskyvning: 0 = søndag, 6 = lørdag.
 * Null ved ugyldig dato.
 */
export function getWeekday(isoDate: string): number | null {
  const date = parseIsoDate(isoDate)
  return date === null ? null : date.getDay()
}

/** Gyldig lokal Date fra «yyyy-MM-dd», eller null. */
export function parseIsoDate(isoDate: string): Date | null {
  if (!DATE_PATTERN.test(isoDate)) return null
  const [year, month, day] = isoDate.split("-").map(Number)
  if (year === undefined || month === undefined || day === undefined) return null
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** Kombinerer dato og klokkeslett til et lokalt tidspunkt. Null ved ugyldig input. */
export function toDateTime(isoDate: string, time: string): Date | null {
  const date = parseIsoDate(isoDate)
  const minutes = timeToMinutes(time)
  if (date === null || minutes === null) return null
  date.setMinutes(minutes)
  return date
}

export function isWeekend(isoDate: string): boolean {
  const weekday = getWeekday(isoDate)
  return weekday === 0 || weekday === 6
}
