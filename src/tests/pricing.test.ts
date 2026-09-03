import { describe, expect, it } from "vitest"

import { calculatePrice, describePriceEstimate } from "@/lib/pricing"
import { NBSP, formatCurrency, formatPriceEstimate } from "@/lib/formatters"

/** Gjør harde mellomrom om til vanlige slik at forventningene er lesbare. */
function plain(text: string): string {
  return text.replaceAll(NBSP, " ")
}

describe("formatering", () => {
  it("bruker hardt mellomrom som tusenskille", () => {
    expect(formatCurrency(3910)).toBe(`3${NBSP}910${NBSP}kr`)
    expect(plain(formatCurrency(1234567))).toBe("1 234 567 kr")
  })
})

describe("prisberegning – prisgruppe I", () => {
  it("gir fast pris for konsert uten billettinntekter", () => {
    const estimate = calculatePrice({ buildingId: "sarpsborg", purposeId: "concert_free" })
    expect(estimate).toEqual({ kind: "fixed", amount: 3910 })
    expect(plain(formatPriceEstimate(estimate))).toBe("3 910 kr")
  })

  it("gir fast pris for øvelse", () => {
    expect(calculatePrice({ buildingId: "tune", purposeId: "rehearsal" })).toEqual({
      kind: "fixed",
      amount: 1520,
    })
  })

  it("beregner 15 % av billettinntektene", () => {
    const estimate = calculatePrice({
      buildingId: "skjeberg",
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: 60000,
    })
    expect(estimate.kind).toBe("percentage")
    expect(estimate).toMatchObject({ amount: 9000, rate: 0.15 })
    expect(estimate.kind === "percentage" ? estimate.clampedTo : "feil").toBeUndefined()
  })

  it("bruker minimumspris 4 600 kr når 15 % blir lavere", () => {
    const estimate = calculatePrice({
      buildingId: "sarpsborg",
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: 10000,
    })
    expect(estimate).toMatchObject({ kind: "percentage", amount: 4600, clampedTo: "minimum" })
    expect(plain(describePriceEstimate(estimate))).toContain("minimum 4 600 kr")
  })

  it("bruker minimumspris når billettinntekt mangler", () => {
    const estimate = calculatePrice({ buildingId: "sarpsborg", purposeId: "concert_ticketed" })
    expect(estimate).toMatchObject({ kind: "percentage", amount: 4600, clampedTo: "minimum" })
  })

  it("begrenser til maksimum 30 000 kr", () => {
    const estimate = calculatePrice({
      buildingId: "tune",
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: 500000,
    })
    expect(estimate).toMatchObject({ kind: "percentage", amount: 30000, clampedTo: "maximum" })
    expect(plain(formatPriceEstimate(estimate))).toBe("30 000 kr")
    expect(plain(describePriceEstimate(estimate))).toContain("maksimum 30 000 kr")
  })
})

describe("prisberegning – prisgruppe II", () => {
  it("gir fast pris for konsert uten billettinntekter", () => {
    expect(calculatePrice({ buildingId: "greaker", purposeId: "concert_free" })).toEqual({
      kind: "fixed",
      amount: 2530,
    })
  })

  it("gir fast pris for øvelse", () => {
    expect(calculatePrice({ buildingId: "kurland", purposeId: "rehearsal" })).toEqual({
      kind: "fixed",
      amount: 1150,
    })
  })

  it("bruker minimumspris 3 040 kr ved lave billettinntekter", () => {
    const estimate = calculatePrice({
      buildingId: "hafslundsoy",
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: 5000,
    })
    expect(estimate).toMatchObject({ kind: "percentage", amount: 3040, clampedTo: "minimum" })
  })

  it("har ingen maksimumspris", () => {
    const estimate = calculatePrice({
      buildingId: "greaker",
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: 500000,
    })
    expect(estimate).toMatchObject({ kind: "percentage", amount: 75000 })
    expect(estimate.kind === "percentage" ? estimate.clampedTo : "feil").toBeUndefined()
    expect(estimate.kind === "percentage" ? estimate.maximum : 0).toBeUndefined()
  })
})

describe("prisberegning – andre satser", () => {
  it("viser «Fra 2 530 kr» for vielse", () => {
    const estimate = calculatePrice({ buildingId: "sarpsborg", purposeId: "wedding" })
    expect(plain(formatPriceEstimate(estimate))).toBe("Fra 2 530 kr")
  })

  it("gir faste satser for gravferd innenbys og utenbys", () => {
    expect(
      plain(formatPriceEstimate(calculatePrice({ buildingId: "tune", purposeId: "funeral_local" }))),
    ).toBe("1 510 kr")
    expect(
      plain(
        formatPriceEstimate(calculatePrice({ buildingId: "tune", purposeId: "funeral_external" })),
      ),
    ).toBe("2 720 kr")
  })

  it("viser «Fra 2 010 kr» for selskap i Hafslundsøy kirke", () => {
    const estimate = calculatePrice({ buildingId: "hafslundsoy", purposeId: "party_seminar" })
    expect(plain(formatPriceEstimate(estimate))).toBe("Fra 2 010 kr")
  })

  it("viser «Pris avklares» for øvrige selskaper og andre arrangementer", () => {
    expect(
      formatPriceEstimate(calculatePrice({ buildingId: "greaker", purposeId: "party_seminar" })),
    ).toBe("Pris avklares")
    expect(
      formatPriceEstimate(calculatePrice({ buildingId: "sarpsborg", purposeId: "other" })),
    ).toBe("Pris avklares")
  })
})
