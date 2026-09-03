import type { EventNeeds } from "@/domain/event"
import { getVenue, type VenueId } from "@/domain/venue"
import type { AvailabilitySlot } from "@/domain/availabilityEngine"
import type { SuitabilityResult } from "@/domain/suitabilityEngine"

/**
 * Kompleksitetsvurdering av SAKEN, ikke av søkeren.
 * Nivået sier hvor mye manuelt arbeid saken sannsynligvis krever.
 */

export type ComplexityLevel = "lav" | "middels" | "hoy"

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  lav: "Lav",
  middels: "Middels",
  hoy: "Høy",
}

export interface ComplexityFactor {
  label: string
  points: number
}

export interface ComplexityAssessment {
  level: ComplexityLevel
  score: number
  factors: readonly ComplexityFactor[]
}

export const COMPLEXITY_THRESHOLDS = { middels: 3, hoy: 7 } as const

export interface ComplexityInput {
  needs: EventNeeds
  venueId: VenueId
  suitability: SuitabilityResult
  availability: AvailabilitySlot
  missingInfo: readonly string[]
}

export function assessComplexity(input: ComplexityInput): ComplexityAssessment {
  const { needs, suitability, availability, missingInfo } = input
  const venue = getVenue(input.venueId)
  const factors: ComplexityFactor[] = []

  if (needs.expectedAttendees >= 200) {
    factors.push({ label: "Høyt deltakerantall (200 eller flere)", points: 3 })
  } else if (needs.expectedAttendees >= 100) {
    factors.push({ label: "Mange deltakere (100 eller flere)", points: 2 })
  }

  if (needs.amplifiedMusic === true) {
    factors.push({ label: "Forsterket musikk", points: 2 })
  }

  const technicalNeeds = needs.requiredFacilities.filter((f) =>
    ["lydanlegg", "projektor", "scene", "piano", "orgel"].includes(f),
  ).length
  if (technicalNeeds >= 3) {
    factors.push({ label: `Mange tekniske behov (${technicalNeeds})`, points: 2 })
  }

  if (venue.isSacredSpace) {
    factors.push({ label: "Arrangement i selve kirkerommet", points: 1 })
  }

  if (availability.state === "opptatt" || availability.conflicts.length > 0) {
    factors.push({ label: "Kalenderkonflikt i ønsket tidsrom", points: 3 })
  } else if (
    availability.state === "forelopig_reservert" ||
    availability.state === "kan_forespores"
  ) {
    factors.push({ label: "Tidspunktet krever koordinering", points: 2 })
  } else if (availability.state === "krever_vurdering") {
    factors.push({ label: "Tidspunktet krever manuell vurdering", points: 2 })
  }

  if (needs.expectedAttendees > venue.staffRequiredAbove) {
    factors.push({ label: "Behov for ekstra bemanning", points: 2 })
  }

  if (missingInfo.length > 0) {
    factors.push({ label: `Manglende informasjon (${missingInfo.length} punkter)`, points: 2 })
  }

  if (suitability.requiresManualApproval) {
    factors.push({ label: "Avvik fra lokalets normale bruk", points: 2 })
  }

  if (suitability.missingRequirements.length > 0) {
    factors.push({
      label: `Lokalet dekker ikke alle behov (${suitability.missingRequirements.length})`,
      points: 2,
    })
  }

  if (needs.servingAlcohol === true) {
    factors.push({ label: "Alkoholservering", points: 2 })
  }

  const score = factors.reduce((sum, f) => sum + f.points, 0)
  const level: ComplexityLevel =
    score >= COMPLEXITY_THRESHOLDS.hoy
      ? "hoy"
      : score >= COMPLEXITY_THRESHOLDS.middels
        ? "middels"
        : "lav"

  if (factors.length === 0) {
    factors.push({ label: "Standard arrangement uten særskilte behov", points: 0 })
  }

  return { level, score, factors }
}

/** Finner hva saksbehandleren mangler for å kunne avgjøre saken. */
export function findMissingInfo(needs: EventNeeds): readonly string[] {
  const missing: string[] = []

  if (needs.description.trim().length < 30) {
    missing.push("Kort beskrivelse av arrangementet er mangelfull.")
  }
  if (needs.expectedAttendees <= 0) {
    missing.push("Forventet antall personer mangler.")
  }
  if (needs.eventType === "annet" && needs.otherNeeds.trim().length === 0) {
    missing.push("Arrangementstypen «Annet» krever en nærmere beskrivelse.")
  }
  if (needs.amplifiedMusic === true && needs.requiredFacilities.includes("lydanlegg") === false) {
    missing.push("Forsterket musikk er oppgitt, men det er ikke bedt om lydanlegg. Bruker dere eget utstyr?")
  }
  if (needs.servingAlcohol === true) {
    missing.push("Dokumentasjon på skjenkebevilling er ikke levert.")
  }

  return missing
}
