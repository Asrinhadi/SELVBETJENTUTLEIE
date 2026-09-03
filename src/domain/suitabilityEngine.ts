import type { EventNeeds } from "@/domain/event"
import {
  FACILITY_LABELS,
  VENUES,
  type FacilityId,
  type Venue,
  type VenueId,
} from "@/domain/venue"

/**
 * Regelbasert egnethetsmotor.
 *
 * Ingen KI og ingen skjulte vekter: hver regel gir et navngitt utslag som
 * vises for brukeren under «Hvorfor anbefales dette?». Alle regler og
 * terskler er FIKTIVE DEMOREGLER laget for prototypen, og er ikke
 * retningslinjene til noe faktisk kirkelig fellesråd.
 */

export type SuitabilityVerdict = "god_match" | "mulig" | "ma_vurderes" | "ikke_egnet"

export const VERDICT_LABELS: Record<SuitabilityVerdict, string> = {
  god_match: "God match",
  mulig: "Mulig",
  ma_vurderes: "Må vurderes",
  ikke_egnet: "Ikke egnet",
}

export type ReasonKind = "positiv" | "advarsel" | "mangel"

export interface SuitabilityReason {
  kind: ReasonKind
  /** Kort regelnavn, til bruk i forklaringen. */
  rule: string
  text: string
  /** Poengutslag. Negativt trekker ned. */
  points: number
}

export interface SuitabilityResult {
  venueId: VenueId
  score: number
  verdict: SuitabilityVerdict
  reasons: readonly SuitabilityReason[]
  warnings: readonly string[]
  missingRequirements: readonly string[]
  requiresManualApproval: boolean
}

const MAX_SCORE = 100

/** Terskler for hvordan poengsummen oversettes til et resultat. */
export const THRESHOLDS = {
  godMatch: 85,
  mulig: 60,
} as const

function facilityLabel(id: FacilityId): string {
  return FACILITY_LABELS[id]
}

/** Vurderer ett lokale mot behovene. Ren funksjon uten sideeffekter. */
export function evaluateVenue(needs: EventNeeds, venue: Venue): SuitabilityResult {
  const reasons: SuitabilityReason[] = []
  const missingRequirements: string[] = []
  const warnings: string[] = []
  let requiresManualApproval = false
  /** Blokkerende funn gjør lokalet ikke egnet uansett poengsum. */
  let blocked = false

  // --- Regel 1: kapasitet ---
  const attendees = needs.expectedAttendees
  if (attendees > venue.maxCapacity) {
    blocked = true
    missingRequirements.push(
      `Kapasitet: lokalet tar maksimalt ${venue.maxCapacity} personer, dere er ${attendees}.`,
    )
    reasons.push({
      kind: "mangel",
      rule: "Kapasitet",
      text: `For lav kapasitet. Lokalet tar maksimalt ${venue.maxCapacity} personer.`,
      points: -60,
    })
  } else if (attendees > venue.seatedCapacity) {
    requiresManualApproval = true
    warnings.push(
      `Over ${venue.seatedCapacity} sitteplasser. Deler av publikum må stå, og rømningsveier må vurderes.`,
    )
    reasons.push({
      kind: "advarsel",
      rule: "Kapasitet",
      text: `Kapasiteten er nær øvre grense: ${attendees} av maks ${venue.maxCapacity}.`,
      points: -18,
    })
  } else if (attendees >= venue.seatedCapacity * 0.6) {
    reasons.push({
      kind: "positiv",
      rule: "Kapasitet",
      text: `Riktig kapasitet: ${attendees} personer i et lokale med ${venue.seatedCapacity} sitteplasser.`,
      points: 0,
    })
  } else if (attendees < venue.seatedCapacity * 0.2) {
    reasons.push({
      kind: "advarsel",
      rule: "Kapasitet",
      text: `Lokalet er romslig for ${attendees} personer og kan oppleves tomt.`,
      points: -8,
    })
  } else {
    reasons.push({
      kind: "positiv",
      rule: "Kapasitet",
      text: `God plass til ${attendees} personer.`,
      points: 0,
    })
  }

  // --- Regel 2: etterspurte fasiliteter ---
  const facilitySet = new Set<FacilityId>(venue.facilities)
  const matched: FacilityId[] = []
  for (const facility of needs.requiredFacilities) {
    if (facilitySet.has(facility)) {
      matched.push(facility)
    } else {
      missingRequirements.push(`Mangler ${facilityLabel(facility).toLowerCase()}.`)
      reasons.push({
        kind: "mangel",
        rule: "Fasiliteter",
        text: `Lokalet har ikke ${facilityLabel(facility).toLowerCase()}.`,
        points: -22,
      })
    }
  }
  if (matched.length > 0) {
    reasons.push({
      kind: "positiv",
      rule: "Fasiliteter",
      text: `Har ${matched.map(facilityLabel).join(", ").toLowerCase()}.`,
      points: 0,
    })
  }

  // --- Regel 3: scene ---
  if (needs.needsStage === true) {
    if (facilitySet.has("scene")) {
      reasons.push({
        kind: "positiv",
        rule: "Scene",
        text: "Lokalet har fast scene.",
        points: 0,
      })
    } else if (venue.isSacredSpace) {
      warnings.push("Ingen fast scene. Koret kan brukes som spilleområde etter avtale.")
      reasons.push({
        kind: "advarsel",
        rule: "Scene",
        text: "Ingen fast scene, men koret kan brukes etter avtale.",
        points: -10,
      })
    } else {
      missingRequirements.push("Mangler scene.")
      reasons.push({
        kind: "mangel",
        rule: "Scene",
        text: "Lokalet har ikke scene.",
        points: -18,
      })
    }
  }

  // --- Regel 4: forsterket musikk i kirkerom ---
  if (needs.amplifiedMusic === true && !venue.allowsAmplifiedMusic) {
    requiresManualApproval = true
    warnings.push(
      "Forsterket musikk i kirkerommet må avklares med kirkevergen på grunn av lydnivå og akustikk.",
    )
    reasons.push({
      kind: "advarsel",
      rule: "Lydnivå",
      text: "Forsterket musikk krever egen avklaring i dette lokalet.",
      points: -15,
    })
  }

  // --- Regel 5: servering ---
  if (needs.servingFood === true && !venue.allowsFoodService) {
    blocked = true
    missingRequirements.push("Servering av mat er ikke tillatt i dette lokalet.")
    reasons.push({
      kind: "mangel",
      rule: "Servering",
      text: "Servering av mat er ikke tillatt i kirkerommet.",
      points: -45,
    })
  } else if (needs.servingFood === true) {
    reasons.push({
      kind: "positiv",
      rule: "Servering",
      text: "Servering er tillatt, og lokalet har kjøkken.",
      points: 0,
    })
  }

  if (needs.servingAlcohol === true) {
    if (venue.isSacredSpace) {
      blocked = true
      missingRequirements.push("Alkoholservering er ikke tillatt i kirkerommet.")
      reasons.push({
        kind: "mangel",
        rule: "Alkohol",
        text: "Alkoholservering er ikke tillatt i kirkerommet.",
        points: -45,
      })
    } else {
      requiresManualApproval = true
      warnings.push("Alkoholservering krever egen godkjenning og eventuell skjenkebevilling.")
      reasons.push({
        kind: "advarsel",
        rule: "Alkohol",
        text: "Alkoholservering krever egen godkjenning.",
        points: -12,
      })
    }
  }

  // --- Regel 6: arrangementstype mot lokalets normale bruk ---
  const sacredMismatch =
    venue.isSacredSpace &&
    (needs.eventType === "selskap" ||
      needs.eventType === "kurs" ||
      needs.eventType === "mote")
  if (sacredMismatch) {
    requiresManualApproval = true
    warnings.push(
      "Arrangementstypen avviker fra kirkerommets normale bruk og må vurderes av kirkevergen.",
    )
    reasons.push({
      kind: "advarsel",
      rule: "Bruksområde",
      text: "Avviker fra lokalets normale bruk.",
      points: -20,
    })
  }

  // --- Regel 7: bemanning ---
  if (attendees > venue.staffRequiredAbove) {
    requiresManualApproval = true
    warnings.push(
      `Arrangementet krever ekstra bemanning fordi det er over ${venue.staffRequiredAbove} deltakere.`,
    )
    reasons.push({
      kind: "advarsel",
      rule: "Bemanning",
      text: `Krever ekstra bemanning over ${venue.staffRequiredAbove} deltakere.`,
      points: -12,
    })
  }

  // --- Regel 8: billettsalg i kirkerom ---
  if (needs.ticketed === true && venue.isSacredSpace) {
    requiresManualApproval = true
    warnings.push("Billettsalg i kirkerommet krever egen avtale om leievilkår.")
    reasons.push({
      kind: "advarsel",
      rule: "Billettsalg",
      text: "Billettsalg i kirkerommet krever egen avtale.",
      points: -8,
    })
  }

  const penalty = reasons.reduce((sum, r) => sum + Math.min(0, r.points), 0)
  const score = blocked ? 0 : Math.max(0, Math.min(MAX_SCORE, MAX_SCORE + penalty))

  return {
    venueId: venue.id,
    score,
    verdict: decideVerdict({ blocked, score, requiresManualApproval, missingRequirements }),
    reasons,
    warnings,
    missingRequirements,
    requiresManualApproval,
  }
}

function decideVerdict(input: {
  blocked: boolean
  score: number
  requiresManualApproval: boolean
  missingRequirements: readonly string[]
}): SuitabilityVerdict {
  if (input.blocked) return "ikke_egnet"
  if (input.missingRequirements.length > 0) {
    return input.score >= THRESHOLDS.mulig ? "ma_vurderes" : "ikke_egnet"
  }
  if (input.requiresManualApproval) return "ma_vurderes"
  if (input.score >= THRESHOLDS.godMatch) return "god_match"
  if (input.score >= THRESHOLDS.mulig) return "mulig"
  return "ma_vurderes"
}

const VERDICT_ORDER: Record<SuitabilityVerdict, number> = {
  god_match: 0,
  mulig: 1,
  ma_vurderes: 2,
  ikke_egnet: 3,
}

/** Vurderer alle lokaler og sorterer de beste først. */
export function rankVenues(
  needs: EventNeeds,
  venues: readonly Venue[] = VENUES,
): readonly SuitabilityResult[] {
  return venues
    .map((venue) => evaluateVenue(needs, venue))
    .sort((a, b) => {
      const byVerdict = VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]
      if (byVerdict !== 0) return byVerdict
      return b.score - a.score
    })
}
