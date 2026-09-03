import {
  getBuilding,
  type BuildingId,
  type PriceEstimate,
  type PriceGroup,
  type PurposeId,
} from "@/domain/rental"
import { formatCurrency, NBSP } from "@/lib/formatters"

interface GroupRates {
  concertFree: number
  rehearsal: number
  ticketRate: number
  ticketMinimum: number
  ticketMaximum?: number
}

export const PRICE_GROUP_RATES: Record<PriceGroup, GroupRates> = {
  I: {
    concertFree: 3910,
    rehearsal: 1520,
    ticketRate: 0.15,
    ticketMinimum: 4600,
    ticketMaximum: 30000,
  },
  II: {
    concertFree: 2530,
    rehearsal: 1150,
    ticketRate: 0.15,
    ticketMinimum: 3040,
  },
}

export const OTHER_RATES = {
  weddingFrom: 2530,
  funeralLocal: 1510,
  funeralExternal: 2720,
  partyHafslundsoyFrom: 2010,
} as const

export interface PricingInput {
  buildingId: BuildingId
  purposeId: PurposeId
  estimatedTicketRevenue?: number
}

/**
 * Beregner foreløpig pris for en forespørsel. Ren funksjon uten sideeffekter.
 * Beløpet er ikke et bindende tilbud – det kommuniseres i UI-et.
 */
export function calculatePrice(input: PricingInput): PriceEstimate {
  const building = getBuilding(input.buildingId)
  const rates = PRICE_GROUP_RATES[building.priceGroup]

  switch (input.purposeId) {
    case "concert_free":
      return { kind: "fixed", amount: rates.concertFree }

    case "rehearsal":
      return { kind: "fixed", amount: rates.rehearsal }

    case "concert_ticketed":
      return calculateTicketedConcert(rates, input.estimatedTicketRevenue ?? 0)

    case "wedding":
      return { kind: "from", amount: OTHER_RATES.weddingFrom }

    case "funeral_local":
      return { kind: "fixed", amount: OTHER_RATES.funeralLocal }

    case "funeral_external":
      return { kind: "fixed", amount: OTHER_RATES.funeralExternal }

    case "party_seminar":
      if (building.id === "hafslundsoy") {
        return { kind: "from", amount: OTHER_RATES.partyHafslundsoyFrom }
      }
      return { kind: "to_be_clarified" }

    case "other":
      return { kind: "to_be_clarified" }
  }
}

function calculateTicketedConcert(
  rates: GroupRates,
  revenue: number,
): PriceEstimate {
  const safeRevenue = Number.isFinite(revenue) && revenue > 0 ? revenue : 0
  const raw = Math.round(safeRevenue * rates.ticketRate)

  if (raw < rates.ticketMinimum) {
    return {
      kind: "percentage",
      amount: rates.ticketMinimum,
      rate: rates.ticketRate,
      revenue: safeRevenue,
      minimum: rates.ticketMinimum,
      maximum: rates.ticketMaximum,
      clampedTo: "minimum",
    }
  }

  if (rates.ticketMaximum !== undefined && raw > rates.ticketMaximum) {
    return {
      kind: "percentage",
      amount: rates.ticketMaximum,
      rate: rates.ticketRate,
      revenue: safeRevenue,
      minimum: rates.ticketMinimum,
      maximum: rates.ticketMaximum,
      clampedTo: "maximum",
    }
  }

  return {
    kind: "percentage",
    amount: raw,
    rate: rates.ticketRate,
    revenue: safeRevenue,
    minimum: rates.ticketMinimum,
    maximum: rates.ticketMaximum,
  }
}

/** Kort forklaring av hvordan beløpet er beregnet, til bruk i oppsummeringen. */
export function describePriceEstimate(estimate: PriceEstimate): string {
  switch (estimate.kind) {
    case "fixed":
      return "Fast sats etter gjeldende prisliste."
    case "from":
      return "Startpris. Endelig beløp avhenger av omfang og avklares av saksbehandler."
    case "to_be_clarified":
      return "Prisen avklares av saksbehandler før eventuell bekreftelse."
    case "percentage": {
      const percent = `${Math.round(estimate.rate * 100)}${NBSP}%`
      if (estimate.clampedTo === "minimum") {
        return `${percent} av estimerte billettinntekter, men minimum ${formatCurrency(estimate.minimum)}.`
      }
      if (estimate.clampedTo === "maximum" && estimate.maximum !== undefined) {
        return `${percent} av estimerte billettinntekter, begrenset til maksimum ${formatCurrency(estimate.maximum)}.`
      }
      return `${percent} av estimerte billettinntekter (${formatCurrency(estimate.revenue)}).`
    }
  }
}
