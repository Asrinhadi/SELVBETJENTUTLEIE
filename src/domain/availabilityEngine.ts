import type { EventNeeds } from "@/domain/event"
import { getVenue, type VenueId } from "@/domain/venue"
import { getWeekday, minutesToTime, timeToMinutes } from "@/lib/time"

/**
 * Indikativ tilgjengelighet basert på en fiktiv demokalender.
 * «Ledig» betyr aldri «bekreftet» – reservasjonen avgjøres i saksbehandlingen.
 */

export const AVAILABILITY_STATES = [
  "ledig",
  "opptatt",
  "kan_forespores",
  "forelopig_reservert",
  "krever_vurdering",
] as const

export type AvailabilityState = (typeof AVAILABILITY_STATES)[number]

export const AVAILABILITY_LABELS: Record<AvailabilityState, string> = {
  ledig: "Ledig",
  opptatt: "Opptatt",
  kan_forespores: "Kan forespørres",
  forelopig_reservert: "Foreløpig reservert",
  krever_vurdering: "Krever manuell vurdering",
}

export const AVAILABILITY_DISCLAIMER =
  "Tilgjengeligheten er indikativ. Endelig reservasjon avhenger av arrangementstype, bemanning og godkjenning."

export type BookingKind = "bekreftet" | "forelopig" | "gudstjeneste"

export interface CalendarBooking {
  id: string
  venueId: VenueId
  /** yyyy-MM-dd */
  date: string
  /** HH:mm */
  start: string
  /** HH:mm */
  end: string
  title: string
  kind: BookingKind
}

export interface CalendarConflict {
  bookingId: string
  title: string
  kind: BookingKind
  timeRange: string
}

export interface AvailabilitySlot {
  venueId: VenueId
  date: string
  state: AvailabilityState
  label: string
  reason: string
  conflicts: readonly CalendarConflict[]
  /** Arrangementets egen tid. */
  eventFrom: string
  eventTo: string
  /** Tiden lokalet faktisk er opptatt, inkludert klargjøring og rydding. */
  blockedFrom: string
  blockedTo: string
}

const EARLIEST_MINUTES = 8 * 60
const LATEST_MINUTES = 23 * 60
const SUNDAY = 0
const SERVICE_START = 9 * 60
const SERVICE_END = 14 * 60
/** Under så mange minutter mellom to arrangementer må det forespørres. */
const TIGHT_TURNAROUND_MINUTES = 60

export interface BlockedWindow {
  fromMinutes: number
  toMinutes: number
  from: string
  to: string
}

/** Regner ut når lokalet faktisk er opptatt, inkludert klargjøring og rydding. */
export function calculateBlockedWindow(needs: {
  startTime: string
  endTime: string
  setupMinutes: number
  cleanupMinutes: number
}): BlockedWindow | null {
  const start = timeToMinutes(needs.startTime)
  const end = timeToMinutes(needs.endTime)
  if (start === null || end === null || end <= start) return null

  const fromMinutes = Math.max(0, start - Math.max(0, needs.setupMinutes))
  const toMinutes = Math.min(24 * 60, end + Math.max(0, needs.cleanupMinutes))
  return {
    fromMinutes,
    toMinutes,
    from: minutesToTime(fromMinutes),
    to: minutesToTime(toMinutes),
  }
}

function overlaps(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom < bTo && aTo > bFrom
}

export function assessAvailability(
  needs: EventNeeds,
  venueId: VenueId,
  calendar: readonly CalendarBooking[],
): AvailabilitySlot {
  const venue = getVenue(venueId)
  const window = calculateBlockedWindow(needs)
  const weekday = getWeekday(needs.date)

  const base = {
    venueId,
    date: needs.date,
    eventFrom: needs.startTime,
    eventTo: needs.endTime,
    blockedFrom: window?.from ?? needs.startTime,
    blockedTo: window?.to ?? needs.endTime,
  }

  if (!window || weekday === null) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason: "Fyll inn gyldig dato og tidspunkt for å få en indikasjon.",
      conflicts: [],
    }
  }

  const sameDay = calendar.filter((b) => b.venueId === venueId && b.date === needs.date)

  const conflicts: CalendarConflict[] = []
  let nearest = Number.POSITIVE_INFINITY

  for (const booking of sameDay) {
    const bStart = timeToMinutes(booking.start)
    const bEnd = timeToMinutes(booking.end)
    if (bStart === null || bEnd === null) continue

    if (overlaps(window.fromMinutes, window.toMinutes, bStart, bEnd)) {
      conflicts.push({
        bookingId: booking.id,
        title: booking.title,
        kind: booking.kind,
        timeRange: `${booking.start}–${booking.end}`,
      })
    } else {
      const gap =
        bStart >= window.toMinutes
          ? bStart - window.toMinutes
          : window.fromMinutes - bEnd
      nearest = Math.min(nearest, gap)
    }
  }

  if (conflicts.length > 0) {
    const onlyTentative = conflicts.every((c) => c.kind === "forelopig")
    if (onlyTentative) {
      return {
        ...base,
        state: "forelopig_reservert",
        label: AVAILABILITY_LABELS.forelopig_reservert,
        reason:
          "Lokalet har en foreløpig reservasjon i tidsrommet. Den kan falle bort, så forespørselen kan sendes inn.",
        conflicts,
      }
    }
    return {
      ...base,
      state: "opptatt",
      label: AVAILABILITY_LABELS.opptatt,
      reason: `Lokalet er opptatt i tidsrommet ${window.from}–${window.to}, inkludert klargjøring og rydding.`,
      conflicts,
    }
  }

  if (window.fromMinutes < EARLIEST_MINUTES || window.toMinutes > LATEST_MINUTES) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Tidsrommet med klargjøring og rydding faller utenfor kl. 08.00–23.00 og må avklares med kirketjener.",
      conflicts: [],
    }
  }

  if (
    weekday === SUNDAY &&
    overlaps(window.fromMinutes, window.toMinutes, SERVICE_START, SERVICE_END)
  ) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Søndag formiddag er normalt satt av til gudstjeneste og må vurderes manuelt.",
      conflicts: [],
    }
  }

  if (needs.amplifiedMusic === true && !venue.allowsAmplifiedMusic) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Forsterket musikk i dette lokalet krever avklaring før tidspunktet kan reserveres.",
      conflicts: [],
    }
  }

  if (nearest < TIGHT_TURNAROUND_MINUTES) {
    return {
      ...base,
      state: "kan_forespores",
      label: AVAILABILITY_LABELS.kan_forespores,
      reason: `Det er under ${TIGHT_TURNAROUND_MINUTES} minutter til et annet arrangement samme dag. Tidspunktet kan forespørres, men krever koordinering.`,
      conflicts: [],
    }
  }

  return {
    ...base,
    state: "ledig",
    label: AVAILABILITY_LABELS.ledig,
    reason: `Ingen kjente konflikter. Lokalet blokkeres ${window.from}–${window.to} inkludert klargjøring og rydding.`,
    conflicts: [],
  }
}
