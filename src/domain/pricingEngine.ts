import type { EventNeeds } from "@/domain/event"
import { getVenue, type FacilityId, type VenueId } from "@/domain/venue"
import { durationHours, isWeekend } from "@/lib/time"

/**
 * Forklarbart prisoverslag. Hver linje sier hva som er lagt til og hvorfor.
 * Alle satser er FIKTIVE DEMOPRISER laget for prototypen.
 */

export const PRICE_DISCLAIMER =
  "Dette er et foreløpig prisoverslag. Endelig pris fastsettes etter behandling av forespørselen."

export type PriceLineKind =
  | "grunnleie"
  | "tid"
  | "rigg"
  | "rydding"
  | "utstyr"
  | "renhold"
  | "bemanning"
  | "tillegg"
  | "rabatt"

export const PRICE_LINE_GROUP_LABELS: Record<PriceLineKind, string> = {
  grunnleie: "Grunnleie",
  tid: "Leietid",
  rigg: "Riggetid",
  rydding: "Ryddetid",
  utstyr: "Utstyr",
  renhold: "Renhold",
  bemanning: "Bemanning",
  tillegg: "Tillegg",
  rabatt: "Rabatt",
}

export interface PriceLine {
  id: string
  kind: PriceLineKind
  label: string
  /** Forklaringen på hvorfor beløpet er med. */
  detail: string
  amount: number
}

export interface PriceEstimate {
  venueId: VenueId
  lines: readonly PriceLine[]
  total: number
  /** Ekstra forbehold som gjelder dette overslaget. */
  notes: readonly string[]
}

/** Fiktive tilleggssatser, kroner. */
export const EQUIPMENT_RATES: Partial<Record<FacilityId, number>> = {
  piano: 450,
  orgel: 700,
  lydanlegg: 900,
  projektor: 350,
  kjokken: 800,
  scene: 600,
}

export const RATES = {
  /** Rigg og rydding faktureres til halv timesats. */
  setupRateFactor: 0.5,
  staffHourlyRate: 640,
  amplifiedSurcharge: 750,
  weekendSurchargeFactor: 0.15,
  /** Rabatt for ikke-kommersielle arrangementer uten billettsalg. */
  nonCommercialDiscountFactor: 0.2,
  /** Renholdet øker med deltakerantallet. */
  cleaningPerFiftyAttendees: 0.25,
} as const

const NON_COMMERCIAL_TYPES = new Set(["ovelse", "mote", "minnesamvaer"])

function round(amount: number): number {
  return Math.round(amount)
}

export interface PricingOptions {
  /** Manuell justering fra saksbehandler, i kroner. */
  adjustment?: { amount: number; reason: string }
}

export function calculatePrice(
  needs: EventNeeds,
  venueId: VenueId,
  options: PricingOptions = {},
): PriceEstimate {
  const venue = getVenue(venueId)
  const lines: PriceLine[] = []
  const notes: string[] = []

  // Grunnleie
  lines.push({
    id: "grunnleie",
    kind: "grunnleie",
    label: `Grunnleie ${venue.name}`,
    detail: `Fast startsats for lokalet (prisgruppe ${venue.priceGroup}).`,
    amount: venue.baseRate,
  })

  // Leietid
  const hours = durationHours(needs.startTime, needs.endTime)
  const roundedHours = Math.max(1, Math.ceil(hours))
  if (hours > 0) {
    lines.push({
      id: "tid",
      kind: "tid",
      label: `Leietid ${roundedHours} ${roundedHours === 1 ? "time" : "timer"}`,
      detail: `${needs.startTime}–${needs.endTime} avrundet opp til hele timer, ${venue.hourlyRate} kr per time.`,
      amount: venue.hourlyRate * roundedHours,
    })
  }

  // Rigg
  const setupRate = venue.hourlyRate * RATES.setupRateFactor
  if (needs.setupMinutes > 0) {
    const setupHours = needs.setupMinutes / 60
    lines.push({
      id: "rigg",
      kind: "rigg",
      label: `Riggetid ${needs.setupMinutes} min`,
      detail: `Lokalet er utilgjengelig for andre under rigging. Halv timesats, ${round(setupRate)} kr per time.`,
      amount: round(setupRate * setupHours),
    })
  }

  // Rydding
  if (needs.cleanupMinutes > 0) {
    const cleanupHours = needs.cleanupMinutes / 60
    lines.push({
      id: "rydding",
      kind: "rydding",
      label: `Ryddetid ${needs.cleanupMinutes} min`,
      detail: `Tid til opprydding etter arrangementet. Halv timesats, ${round(setupRate)} kr per time.`,
      amount: round(setupRate * cleanupHours),
    })
  }

  // Utstyr
  for (const facility of needs.requiredFacilities) {
    const rate = EQUIPMENT_RATES[facility]
    if (rate === undefined) continue
    if (!venue.facilities.includes(facility)) continue
    lines.push({
      id: `utstyr-${facility}`,
      kind: "utstyr",
      label: labelForFacility(facility),
      detail: "Fast tillegg for bruk av utstyret, uavhengig av lengde.",
      amount: rate,
    })
  }

  // Renhold
  const cleaningSteps = Math.floor(needs.expectedAttendees / 50)
  const cleaning = venue.cleaningFee * (1 + cleaningSteps * RATES.cleaningPerFiftyAttendees)
  lines.push({
    id: "renhold",
    kind: "renhold",
    label: "Renhold",
    detail:
      cleaningSteps > 0
        ? `Grunnsats ${venue.cleaningFee} kr, økt med ${cleaningSteps * 25} % for ${needs.expectedAttendees} deltakere.`
        : `Grunnsats for lokalet, ${needs.expectedAttendees} deltakere.`,
    amount: round(cleaning),
  })

  // Bemanning
  const needsStaff = needs.expectedAttendees > venue.staffRequiredAbove
  if (needsStaff) {
    const blockedHours =
      roundedHours + (needs.setupMinutes + needs.cleanupMinutes) / 60
    const staffHours = Math.max(1, Math.ceil(blockedHours))
    lines.push({
      id: "bemanning",
      kind: "bemanning",
      label: `Kirketjener ${staffHours} ${staffHours === 1 ? "time" : "timer"}`,
      detail: `Arrangementer over ${venue.staffRequiredAbove} deltakere krever bemanning. ${RATES.staffHourlyRate} kr per time inkludert rigg og rydding.`,
      amount: RATES.staffHourlyRate * staffHours,
    })
  }

  // Tillegg: forsterket lyd
  if (needs.amplifiedMusic === true) {
    lines.push({
      id: "tillegg-lyd",
      kind: "tillegg",
      label: "Tillegg for forsterket lyd",
      detail: "Dekker lydteknisk tilsyn og ekstra kontroll av lydnivå.",
      amount: RATES.amplifiedSurcharge,
    })
  }

  // Tillegg: helg
  const subtotalBeforeSurcharges = lines.reduce((sum, l) => sum + l.amount, 0)
  if (isWeekend(needs.date)) {
    lines.push({
      id: "tillegg-helg",
      kind: "tillegg",
      label: "Helgetillegg",
      detail: `${Math.round(RATES.weekendSurchargeFactor * 100)} % tillegg for arrangement lørdag eller søndag.`,
      amount: round(subtotalBeforeSurcharges * RATES.weekendSurchargeFactor),
    })
  }

  // Rabatt
  if (NON_COMMERCIAL_TYPES.has(needs.eventType) && needs.ticketed !== true) {
    const discountBase = lines.reduce((sum, l) => sum + l.amount, 0)
    lines.push({
      id: "rabatt-ideell",
      kind: "rabatt",
      label: "Rabatt for ikke-kommersielt arrangement",
      detail: `${Math.round(RATES.nonCommercialDiscountFactor * 100)} % avslag for arrangement uten billettinntekter.`,
      amount: -round(discountBase * RATES.nonCommercialDiscountFactor),
    })
  }

  // Saksbehandlerjustering
  if (options.adjustment && options.adjustment.amount !== 0) {
    lines.push({
      id: "justering",
      kind: options.adjustment.amount < 0 ? "rabatt" : "tillegg",
      label: "Justering fra saksbehandler",
      detail: options.adjustment.reason,
      amount: round(options.adjustment.amount),
    })
  }

  if (needs.ticketed === true) {
    notes.push(
      "Ved billettsalg kan fellesrådet kreve en andel av billettinntektene i stedet for fast leie. Dette avklares i saksbehandlingen.",
    )
  }
  if (needsStaff) {
    notes.push("Bemanningen bekreftes først når kirketjener er satt opp på vakt.")
  }

  const total = Math.max(0, round(lines.reduce((sum, l) => sum + l.amount, 0)))

  return { venueId, lines, total, notes }
}

function labelForFacility(facility: FacilityId): string {
  switch (facility) {
    case "piano":
      return "Bruk av piano"
    case "orgel":
      return "Bruk av orgel"
    case "lydanlegg":
      return "Bruk av lydanlegg"
    case "projektor":
      return "Bruk av projektor"
    case "kjokken":
      return "Bruk av kjøkken"
    case "scene":
      return "Bruk av scene"
    default:
      return "Utstyr"
  }
}
