import type { CalendarBooking } from "@/domain/availabilityEngine"
import { assessAvailability } from "@/domain/availabilityEngine"
import { assessComplexity, findMissingInfo } from "@/domain/complexity"
import type { EventNeeds } from "@/domain/event"
import { calculatePrice } from "@/domain/pricingEngine"
import { evaluateVenue, rankVenues } from "@/domain/suitabilityEngine"
import { getVenue, type VenueId } from "@/domain/venue"
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
  const id = `sak-${now.getFullYear()}-${String(sequence).padStart(4, "0")}`
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
  verdict: string,
  availabilityState: string,
  missingCount: number,
): string {
  const parts = [
    `Egnethet: ${verdict.replace(/_/g, " ")}.`,
    `Kalender: ${availabilityState.replace(/_/g, " ")}.`,
  ]
  parts.push(
    missingCount > 0
      ? `${missingCount} punkter mangler informasjon.`
      : "Ingen manglende informasjon.",
  )
  return `Automatisk kontroll gjennomført. ${parts.join(" ")}`
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

export function approveCase(
  request: BookingRequest,
  staffName: string,
  at: Date,
): BookingRequest {
  if (request.status === "godkjent" || request.status === "bekreftet") return request
  const from = request.status
  let next = withEvent(
    { ...request, status: "godkjent" },
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
