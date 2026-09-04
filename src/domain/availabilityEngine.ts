import { addDays, subDays } from "date-fns"

import type { EventNeeds } from "@/domain/event"
import { getVenue, type VenueId } from "@/domain/venue"
import {
  MAX_EVENT_MINUTES,
  MINUTES_PER_DAY,
  durationMinutes,
  getWeekday,
  minutesToTime,
  parseIsoDate,
  timeToMinutes,
} from "@/lib/time"
import { toIsoDate } from "@/lib/dates"

/**
 * Indikativ tilgjengelighet basert på en fiktiv demokalender og på saker som
 * allerede ligger i systemet. «Ledig» betyr aldri «bekreftet» – reservasjonen
 * avgjøres i saksbehandlingen.
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
  /** Saken oppføringen stammer fra, når den kommer fra systemets egne saker. */
  caseId?: string
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
  /** Sann når blokkeringen strekker seg inn i neste døgn. */
  crossesMidnight: boolean
}

const EARLIEST_MINUTES = 8 * 60
const LATEST_MINUTES = 23 * 60
const SUNDAY = 0
const SERVICE_START = 9 * 60
const SERVICE_END = 14 * 60
/** Under så mange minutter mellom to arrangementer må det forespørres. */
const TIGHT_TURNAROUND_MINUTES = 60

export interface BlockedWindow {
  /** Minutter fra midnatt på arrangementsdatoen. Kan være negativ eller over 1440. */
  fromMinutes: number
  toMinutes: number
  from: string
  to: string
  crossesMidnight: boolean
}

/** Regner ut når lokalet faktisk er opptatt, inkludert klargjøring og rydding. */
export function calculateBlockedWindow(needs: {
  startTime: string
  endTime: string
  setupMinutes: number
  cleanupMinutes: number
}): BlockedWindow | null {
  const start = timeToMinutes(needs.startTime)
  const duration = durationMinutes(needs.startTime, needs.endTime)
  if (start === null || duration === null) return null

  const fromMinutes = start - Math.max(0, needs.setupMinutes)
  const toMinutes = start + duration + Math.max(0, needs.cleanupMinutes)

  return {
    fromMinutes,
    toMinutes,
    from: minutesToTime(fromMinutes),
    to: minutesToTime(toMinutes),
    crossesMidnight: toMinutes > MINUTES_PER_DAY || fromMinutes < 0,
  }
}

function overlaps(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom < bTo && aTo > bFrom
}

/**
 * Oppføringer på dagen før, selve dagen og dagen etter, omregnet til
 * minutter målt fra midnatt på arrangementsdatoen. Det gjør at et
 * arrangement som går over midnatt sammenlignes riktig.
 */
function bookingsAroundDate(
  calendar: readonly CalendarBooking[],
  venueId: VenueId,
  isoDate: string,
): { booking: CalendarBooking; from: number; to: number }[] {
  const date = parseIsoDate(isoDate)
  if (date === null) return []

  const offsets: { iso: string; shift: number }[] = [
    { iso: toIsoDate(subDays(date, 1)), shift: -MINUTES_PER_DAY },
    { iso: isoDate, shift: 0 },
    { iso: toIsoDate(addDays(date, 1)), shift: MINUTES_PER_DAY },
  ]

  const result: { booking: CalendarBooking; from: number; to: number }[] = []
  for (const { iso, shift } of offsets) {
    for (const booking of calendar) {
      if (booking.venueId !== venueId || booking.date !== iso) continue
      const start = timeToMinutes(booking.start)
      const duration = durationMinutes(booking.start, booking.end)
      if (start === null || duration === null) continue
      result.push({ booking, from: start + shift, to: start + duration + shift })
    }
  }
  return result
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
    crossesMidnight: window?.crossesMidnight ?? false,
  }

  if (!window || weekday === null) {
    return {
      ...base,
      blockedFrom: "–",
      blockedTo: "–",
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Tidspunktet er ikke gyldig ennå. Fyll inn dato, starttid og sluttid for å få en indikasjon.",
      conflicts: [],
    }
  }

  // Et urimelig langt tidsrom skal ikke regnes på som om det var en vanlig
  // reservasjon – da ville panelet vist et misvisende blokkeringsvindu.
  const length = durationMinutes(needs.startTime, needs.endTime)
  if (length !== null && length > MAX_EVENT_MINUTES) {
    return {
      ...base,
      blockedFrom: "–",
      blockedTo: "–",
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason: `Tidsrommet er på ${Math.round(length / 60)} timer. Arrangementer over ${MAX_EVENT_MINUTES / 60} timer må avtales direkte – kontroller at start- og sluttid er riktige.`,
      conflicts: [],
    }
  }

  const nearby = bookingsAroundDate(calendar, venueId, needs.date)
  const conflicts: CalendarConflict[] = []
  let nearest = Number.POSITIVE_INFINITY

  for (const { booking, from, to } of nearby) {
    if (overlaps(window.fromMinutes, window.toMinutes, from, to)) {
      conflicts.push({
        bookingId: booking.id,
        title: booking.title,
        kind: booking.kind,
        timeRange: `${booking.start}–${booking.end}`,
      })
    } else {
      const gap = from >= window.toMinutes ? from - window.toMinutes : window.fromMinutes - to
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
          "Lokalet er allerede forespurt i dette tidsrommet av en sak som ikke er avgjort. Du kan sende inn, men saksbehandler må prioritere mellom forespørslene.",
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

  const withinDay = !window.crossesMidnight
  if (withinDay && (window.fromMinutes < EARLIEST_MINUTES || window.toMinutes > LATEST_MINUTES)) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Tidsrommet med klargjøring og rydding faller utenfor kl. 08.00–23.00 og må avklares med kirketjener.",
      conflicts: [],
    }
  }

  if (!withinDay) {
    return {
      ...base,
      state: "krever_vurdering",
      label: AVAILABILITY_LABELS.krever_vurdering,
      reason:
        "Arrangementet går over midnatt og må avklares med kirketjener på grunn av bemanning og nattarbeid.",
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
      reason: `Det er under ${TIGHT_TURNAROUND_MINUTES} minutter til et annet arrangement i lokalet. Tidspunktet kan forespørres, men krever koordinering.`,
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
