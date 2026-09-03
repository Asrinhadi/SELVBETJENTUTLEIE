import { AVAILABILITY_LABELS, type AvailabilityAssessment } from "@/domain/rental"

export interface AvailabilityInput {
  /** ISO-dato (yyyy-MM-dd) */
  date: string
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Konverterer «HH:mm» til minutter etter midnatt. Returnerer null ved ugyldig format. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null) return false
  return end > start
}

/**
 * Ukedag uten tidssoneproblemer: bygger datoen i lokal tid fra ISO-strengen.
 * 0 = søndag, 6 = lørdag. Returnerer null ved ugyldig dato.
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

const SUNDAY = 0
const SUNDAY_SERVICE_START = 9 * 60
const SUNDAY_SERVICE_END = 14 * 60
const EARLIEST_MINUTES = 8 * 60
const LATEST_MINUTES = 23 * 60

/**
 * Indikativ tilgjengelighet – kun demonstrasjonsregler, ingen ekte kalender.
 *
 *  - Ugyldig dato/tid eller tidspunkt før 08:00 / etter 23:00 → «Må avklares»
 *  - Søndag som overlapper 09:00–14:00 (gudstjenestetid) → «Mulig konflikt»
 *  - Alt annet → «Ser ledig ut»
 *
 * Resultatet reserverer aldri lokalet.
 */
export function assessAvailability(
  input: AvailabilityInput,
): AvailabilityAssessment {
  const start = timeToMinutes(input.startTime)
  const end = timeToMinutes(input.endTime)
  const weekday = getWeekday(input.date)

  if (weekday === null || start === null || end === null) {
    return {
      status: "review",
      label: AVAILABILITY_LABELS.review,
      reason: "Fyll inn gyldig dato og tidspunkt for å få en indikasjon.",
    }
  }

  if (end <= start) {
    return {
      status: "review",
      label: AVAILABILITY_LABELS.review,
      reason: "Sluttid må være etter starttid.",
    }
  }

  if (start < EARLIEST_MINUTES || end > LATEST_MINUTES) {
    return {
      status: "review",
      label: AVAILABILITY_LABELS.review,
      reason:
        "Tidspunkt før kl. 08:00 eller etter kl. 23:00 må avklares med kirketjener.",
    }
  }

  const overlapsSundayService =
    weekday === SUNDAY &&
    start < SUNDAY_SERVICE_END &&
    end > SUNDAY_SERVICE_START

  if (overlapsSundayService) {
    return {
      status: "conflict",
      label: AVAILABILITY_LABELS.conflict,
      reason:
        "Søndager mellom kl. 09:00 og 14:00 er normalt satt av til gudstjeneste.",
    }
  }

  return {
    status: "likely",
    label: AVAILABILITY_LABELS.likely,
    reason:
      "Ingen kjente kollisjoner i demo-kalenderen. Endelig ledighet bekreftes av saksbehandler.",
  }
}
