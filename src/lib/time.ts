const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** «HH:mm» til minutter etter midnatt. Null ved ugyldig format. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** Minutter etter midnatt til «HH:mm». */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null) return false
  return end > start
}

/** Varighet i timer, som desimaltall. */
export function durationHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null || end <= start) return 0
  return (end - start) / 60
}

/**
 * Ukedag uten tidssoneforskyvning: 0 = søndag, 6 = lørdag.
 * Null ved ugyldig dato.
 */
export function getWeekday(isoDate: string): number | null {
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
  return date.getDay()
}

export function isWeekend(isoDate: string): boolean {
  const weekday = getWeekday(isoDate)
  return weekday === 0 || weekday === 6
}
