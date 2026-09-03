import type { EventNeeds } from "@/domain/event"
import type { VenueId } from "@/domain/venue"
import type { SuitabilityResult } from "@/domain/suitabilityEngine"
import type { AvailabilitySlot } from "@/domain/availabilityEngine"
import type { PriceEstimate } from "@/domain/pricingEngine"
import type { ComplexityAssessment } from "@/domain/complexity"

/** Saksgangen fra mottak til bekreftet reservasjon. */
export const CASE_STATUSES = [
  "mottatt",
  "automatisk_kontroll",
  "venter_vurdering",
  "tilleggsinfo_etterspurt",
  "godkjent",
  "avslatt",
  "venter_betaling",
  "bekreftet",
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  mottatt: "Forespørsel mottatt",
  automatisk_kontroll: "Automatisk kontroll gjennomført",
  venter_vurdering: "Venter på vurdering",
  tilleggsinfo_etterspurt: "Tilleggsinformasjon etterspurt",
  godkjent: "Godkjent",
  avslatt: "Avslått",
  venter_betaling: "Venter på betaling",
  bekreftet: "Reservasjon bekreftet",
}

/** Kort variant til tabeller og merker der plassen er trang. */
export const CASE_STATUS_SHORT: Record<CaseStatus, string> = {
  mottatt: "Mottatt",
  automatisk_kontroll: "Kontrollert",
  venter_vurdering: "Til vurdering",
  tilleggsinfo_etterspurt: "Venter på søker",
  godkjent: "Godkjent",
  avslatt: "Avslått",
  venter_betaling: "Venter betaling",
  bekreftet: "Bekreftet",
}

/** Rekkefølgen som vises i statustidslinjen for søkeren. */
export const TIMELINE_STEPS: readonly CaseStatus[] = [
  "mottatt",
  "automatisk_kontroll",
  "venter_vurdering",
  "godkjent",
  "venter_betaling",
  "bekreftet",
]

export type CaseEventType =
  | "opprettet"
  | "automatisk_kontroll"
  | "tildelt"
  | "godkjent"
  | "avslatt"
  | "info_etterspurt"
  | "info_mottatt"
  | "pris_justert"
  | "alternativ_foreslatt"
  | "status_endret"
  | "melding"

export interface CaseEvent {
  id: string
  type: CaseEventType
  /** ISO-tidsstempel */
  timestamp: string
  actor: string
  message: string
  /** Fylles ut når hendelsen endret status, til bruk i revisjonsloggen. */
  fromStatus?: CaseStatus
  toStatus?: CaseStatus
}

export interface CaseMessage {
  id: string
  from: "soker" | "saksbehandler"
  author: string
  /** ISO-tidsstempel */
  timestamp: string
  body: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  initials: string
}

export interface Applicant {
  name: string
  organization?: string
  email: string
  phone: string
}

export interface BookingRequest {
  id: string
  /** KIR-2026-0147 */
  caseNumber: string
  status: CaseStatus
  needs: EventNeeds
  venueId: VenueId
  /** Lokalene motoren anbefalte, i rangert rekkefølge. */
  recommendedVenueIds: readonly VenueId[]
  applicant: Applicant
  suitability: SuitabilityResult
  availability: AvailabilitySlot
  price: PriceEstimate
  complexity: ComplexityAssessment
  /** Informasjon saksbehandleren mangler for å kunne avgjøre saken. */
  missingInfo: readonly string[]
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  events: readonly CaseEvent[]
  messages: readonly CaseMessage[]
}

/** Statuser der saken fortsatt er under aktiv behandling. */
export function isOpenStatus(status: CaseStatus): boolean {
  return status !== "avslatt" && status !== "bekreftet"
}

export function isDecided(status: CaseStatus): boolean {
  return (
    status === "godkjent" ||
    status === "avslatt" ||
    status === "venter_betaling" ||
    status === "bekreftet"
  )
}
