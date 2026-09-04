import type { BookingKind, CalendarBooking } from "@/domain/availabilityEngine"
import { assessAvailability, calculateBlockedWindow } from "@/domain/availabilityEngine"
import { assessComplexity, findMissingInfo } from "@/domain/complexity"
import type { EventNeeds } from "@/domain/event"
import { calculatePrice } from "@/domain/pricingEngine"
import {
  VERDICT_LABELS,
  evaluateVenue,
  rankVenues,
  type SuitabilityVerdict,
} from "@/domain/suitabilityEngine"
import { AVAILABILITY_LABELS, type AvailabilityState } from "@/domain/availabilityEngine"
import { getVenue, type VenueId } from "@/domain/venue"
import { pluralPunkt } from "@/lib/formatters"
import type {
  Applicant,
  BookingRequest,
  CaseEvent,
  CaseEventType,
  CaseMessage,
  CaseStatus,
} from "@/domain/case"

/** Bygger saksnummer på formen KIR-2026-0147. */
export function buildCaseNumber(year: number, sequence: number): string {
  return `KIR-${year}-${String(sequence).padStart(4, "0")}`
}

/**
 * Saks-id-en brukes i URL-en, og skal derfor ikke kunne gjettes eller telles.
 * Saksnummeret (KIR-2026-0147) vises til brukeren, men er ikke adressen.
 */
export function newCaseId(): string {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Hvilken plass en sak legger beslag på i kalenderen. Uten dette ville to
 * søkere kunne be om samme lokale til samme tid og begge få «Ledig».
 */
const BLOCKING_KIND: Record<CaseStatus, BookingKind | null> = {
  mottatt: "forelopig",
  automatisk_kontroll: "forelopig",
  venter_vurdering: "forelopig",
  tilleggsinfo_etterspurt: "forelopig",
  godkjent: "bekreftet",
  venter_betaling: "bekreftet",
  bekreftet: "bekreftet",
  avslatt: null,
}

/**
 * Gjør sakene i systemet om til kalenderoppføringer, slik at nye
 * forespørsler vurderes mot dem. Tidsrommet inkluderer klargjøring og
 * rydding, som allerede er regnet ut for hver sak.
 */
export function casesToBookings(
  cases: readonly BookingRequest[],
  excludeCaseId?: string,
): CalendarBooking[] {
  const bookings: CalendarBooking[] = []

  for (const request of cases) {
    if (request.id === excludeCaseId) continue
    const kind = BLOCKING_KIND[request.status]
    if (!kind) continue

    const window = calculateBlockedWindow(request.needs)
    if (!window) continue

    bookings.push({
      id: `sak-${request.id}`,
      caseId: request.id,
      venueId: request.venueId,
      date: request.needs.date,
      // Går klargjøringen tilbake til forrige døgn, blokkerer vi fra midnatt.
      // Det sperrer litt mer enn nødvendig, men aldri for lite.
      start: window.fromMinutes < 0 ? "00:00" : window.from,
      end: window.to,
      title:
        kind === "bekreftet"
          ? `Reservert: ${request.caseNumber}`
          : `Forespurt: ${request.caseNumber}`,
      kind,
    })
  }

  return bookings
}

/** Demokalenderen pluss sakene i systemet, klar til bruk i vurderingen. */
export function buildEffectiveCalendar(
  baseCalendar: readonly CalendarBooking[],
  cases: readonly BookingRequest[],
  excludeCaseId?: string,
): readonly CalendarBooking[] {
  return [...baseCalendar, ...casesToBookings(cases, excludeCaseId)]
}

function eventId(request: Pick<BookingRequest, "id" | "events">): string {
  return `${request.id}-evt-${request.events.length + 1}`
}

export interface CreateCaseInput {
  needs: EventNeeds
  venueId: VenueId
  applicant: Applicant
  calendar: readonly CalendarBooking[]
}

/**
 * Setter sammen en komplett sak: kjører egnethet, tilgjengelighet, pris og
 * kompleksitet, og legger inn de to første hendelsene i historikken.
 * Ren funksjon – løpenummer og tidspunkt sendes inn.
 */
export function createCase(
  input: CreateCaseInput,
  sequence: number,
  now: Date,
): BookingRequest {
  const { needs, venueId, applicant, calendar } = input
  const timestamp = now.toISOString()
  const id = newCaseId()
  const caseNumber = buildCaseNumber(now.getFullYear(), sequence)

  const suitability = evaluateVenue(needs, getVenue(venueId))
  const availability = assessAvailability(needs, venueId, calendar)
  const price = calculatePrice(needs, venueId)
  const missingInfo = findMissingInfo(needs)
  const complexity = assessComplexity({
    needs,
    venueId,
    suitability,
    availability,
    missingInfo,
  })
  const recommendedVenueIds = rankVenues(needs)
    .filter((r) => r.verdict !== "ikke_egnet")
    .slice(0, 3)
    .map((r) => r.venueId)

  const needsManualReview =
    suitability.requiresManualApproval ||
    suitability.verdict === "ma_vurderes" ||
    availability.state !== "ledig" ||
    missingInfo.length > 0 ||
    complexity.level !== "lav"

  const status: CaseStatus = needsManualReview ? "venter_vurdering" : "automatisk_kontroll"

  const events: CaseEvent[] = [
    {
      id: `${id}-evt-1`,
      type: "opprettet",
      timestamp,
      actor: applicant.name,
      message: `Forespørsel sendt inn via KirkeFlow. Saksnummer ${caseNumber}.`,
      toStatus: "mottatt",
    },
    {
      id: `${id}-evt-2`,
      type: "automatisk_kontroll",
      timestamp,
      actor: "KirkeFlow",
      message: buildAutoCheckMessage(suitability.verdict, availability.state, missingInfo.length),
      fromStatus: "mottatt",
      toStatus: status,
    },
  ]

  return {
    id,
    caseNumber,
    status,
    needs,
    venueId,
    recommendedVenueIds,
    applicant,
    suitability,
    availability,
    price,
    complexity,
    missingInfo,
    assignedTo: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    events,
    messages: [],
  }
}

function buildAutoCheckMessage(
  verdict: SuitabilityVerdict,
  availabilityState: AvailabilityState,
  missingCount: number,
): string {
  const parts = [
    `Egnethet: ${VERDICT_LABELS[verdict]}.`,
    `Kalender: ${AVAILABILITY_LABELS[availabilityState]}.`,
    missingCount > 0
      ? `Mangler informasjon på ${pluralPunkt(missingCount)}.`
      : "Ingen manglende informasjon.",
  ]
  return `Automatisk kontroll gjennomført. ${parts.join(" ")}`
}

/**
 * Regner ut tilgjengelighet, manglende informasjon og kompleksitet på nytt
 * for én sak, sett mot demokalenderen og alle ANDRE saker. Brukes hver gang
 * sakslisten endrer seg, slik at en ny forespørsel umiddelbart slår ut som
 * konflikt på de sakene den kolliderer med.
 */
export function refreshCase(
  request: BookingRequest,
  baseCalendar: readonly CalendarBooking[],
  allCases: readonly BookingRequest[],
): BookingRequest {
  const calendar = buildEffectiveCalendar(baseCalendar, allCases, request.id)
  const availability = assessAvailability(request.needs, request.venueId, calendar)
  const missingInfo = findMissingInfo(request.needs)
  const complexity = assessComplexity({
    needs: request.needs,
    venueId: request.venueId,
    suitability: request.suitability,
    availability,
    missingInfo,
  })
  return { ...request, availability, missingInfo, complexity }
}

function withEvent(
  request: BookingRequest,
  type: CaseEventType,
  actor: string,
  message: string,
  at: Date,
  statusChange?: { from: CaseStatus; to: CaseStatus },
): BookingRequest {
  const event: CaseEvent = {
    id: eventId(request),
    type,
    timestamp: at.toISOString(),
    actor,
    message,
    ...(statusChange ? { fromStatus: statusChange.from, toStatus: statusChange.to } : {}),
  }
  return {
    ...request,
    updatedAt: at.toISOString(),
    events: [...request.events, event],
  }
}

export function assignCase(
  request: BookingRequest,
  staffId: string,
  staffName: string,
  at: Date,
): BookingRequest {
  if (request.assignedTo === staffId) return request
  return withEvent(
    { ...request, assignedTo: staffId },
    "tildelt",
    staffName,
    `Saken er tildelt ${staffName}.`,
    at,
  )
}

/**
 * Sann når lokalet allerede er opptatt i tidsrommet. En slik sak kan ikke
 * godkjennes på vanlig måte – det ville skapt dobbeltbooking, som er
 * nettopp det systemet skal hindre.
 */
export function hasCalendarConflict(request: BookingRequest): boolean {
  return (
    request.availability.conflicts.length > 0 ||
    request.availability.state === "opptatt" ||
    request.availability.state === "forelopig_reservert"
  )
}

export function approveCase(
  request: BookingRequest,
  staffName: string,
  at: Date,
  /** Påkrevd begrunnelse når saken godkjennes til tross for kalenderkonflikt. */
  overrideReason?: string,
): BookingRequest {
  if (request.status === "godkjent" || request.status === "bekreftet") return request
  // Uten skriftlig begrunnelse skal en konflikt aldri kunne godkjennes.
  if (hasCalendarConflict(request) && !overrideReason) return request

  const from = request.status
  let next = request

  if (overrideReason && hasCalendarConflict(request)) {
    const conflicts = request.availability.conflicts
      .map((c) => `${c.title} (${c.timeRange})`)
      .join(", ")
    next = withEvent(
      next,
      "konflikt_overstyrt",
      staffName,
      `Kalenderkonflikt overstyrt manuelt. Konflikt: ${conflicts || request.availability.label}. Begrunnelse: ${overrideReason}`,
      at,
    )
  }

  next = withEvent(
    { ...next, status: "godkjent" },
    "godkjent",
    staffName,
    "Forespørselen er godkjent. Søker får tilsendt bekreftelse og fakturagrunnlag.",
    at,
    { from, to: "godkjent" },
  )
  next = withEvent(
    { ...next, status: "venter_betaling" },
    "status_endret",
    "KirkeFlow",
    "Fakturagrunnlag opprettet automatisk. Saken venter på betaling.",
    at,
    { from: "godkjent", to: "venter_betaling" },
  )
  return next
}

export function confirmPayment(
  request: BookingRequest,
  staffName: string,
  at: Date,
): BookingRequest {
  if (request.status !== "venter_betaling") return request
  return withEvent(
    { ...request, status: "bekreftet" },
    "status_endret",
    staffName,
    "Betaling registrert. Reservasjonen er bekreftet.",
    at,
    { from: "venter_betaling", to: "bekreftet" },
  )
}

export function rejectCase(
  request: BookingRequest,
  reason: string,
  staffName: string,
  at: Date,
): BookingRequest {
  if (request.status === "avslatt") return request
  return withEvent(
    { ...request, status: "avslatt" },
    "avslatt",
    staffName,
    `Forespørselen er avslått. Begrunnelse: ${reason}`,
    at,
    { from: request.status, to: "avslatt" },
  )
}

export function requestMoreInfo(
  request: BookingRequest,
  message: string,
  staffName: string,
  at: Date,
): BookingRequest {
  const from = request.status
  const withMessage: BookingRequest = {
    ...request,
    status: "tilleggsinfo_etterspurt",
    messages: [
      ...request.messages,
      {
        id: `${request.id}-msg-${request.messages.length + 1}`,
        from: "saksbehandler",
        author: staffName,
        timestamp: at.toISOString(),
        body: message,
      },
    ],
  }
  return withEvent(
    withMessage,
    "info_etterspurt",
    staffName,
    "Tilleggsinformasjon etterspurt fra søker.",
    at,
    { from, to: "tilleggsinfo_etterspurt" },
  )
}

export function adjustPrice(
  request: BookingRequest,
  amount: number,
  reason: string,
  staffName: string,
  at: Date,
): BookingRequest {
  const price = calculatePrice(request.needs, request.venueId, {
    adjustment: { amount, reason },
  })
  const sign = amount < 0 ? "redusert" : "økt"
  return withEvent(
    { ...request, price },
    "pris_justert",
    staffName,
    `Prisoverslaget er ${sign} med ${Math.abs(Math.round(amount))} kr. Begrunnelse: ${reason}`,
    at,
  )
}

export function proposeAlternative(
  request: BookingRequest,
  proposal: string,
  staffName: string,
  at: Date,
): BookingRequest {
  const withMessage: BookingRequest = {
    ...request,
    messages: [
      ...request.messages,
      {
        id: `${request.id}-msg-${request.messages.length + 1}`,
        from: "saksbehandler",
        author: staffName,
        timestamp: at.toISOString(),
        body: proposal,
      },
    ],
  }
  return withEvent(
    withMessage,
    "alternativ_foreslatt",
    staffName,
    "Alternativt lokale eller tidspunkt foreslått for søker.",
    at,
  )
}

export function addApplicantMessage(
  request: BookingRequest,
  body: string,
  at: Date,
): BookingRequest {
  const message: CaseMessage = {
    id: `${request.id}-msg-${request.messages.length + 1}`,
    from: "soker",
    author: request.applicant.name,
    timestamp: at.toISOString(),
    body,
  }
  const next: BookingRequest = {
    ...request,
    messages: [...request.messages, message],
    status: request.status === "tilleggsinfo_etterspurt" ? "venter_vurdering" : request.status,
  }
  return withEvent(next, "info_mottatt", request.applicant.name, "Søker har svart.", at)
}
