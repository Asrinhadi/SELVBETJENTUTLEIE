import { describe, expect, it } from "vitest"

import type { EventNeeds } from "@/domain/event"
import { RATES, calculatePrice } from "@/domain/pricingEngine"
import { getVenue } from "@/domain/venue"

/** Tirsdag, for å unngå helgetillegg i grunnberegningen. */
const WEEKDAY = "2026-09-08"
/** Lørdag. */
const SATURDAY = "2026-09-12"

const BASE: EventNeeds = {
  eventType: "kulturarrangement",
  description: "Foredrag med lysbilder.",
  expectedAttendees: 40,
  date: WEEKDAY,
  startTime: "18:00",
  endTime: "20:00",
  setupMinutes: 60,
  cleanupMinutes: 30,
  requiredFacilities: [],
  otherNeeds: "",
  amplifiedMusic: false,
  ticketed: false,
  needsStage: false,
  publicEvent: true,
}

function lineById(needs: EventNeeds, venueId: Parameters<typeof calculatePrice>[1], id: string) {
  return calculatePrice(needs, venueId).lines.find((l) => l.id === id)
}

describe("grunnleie og leietid", () => {
  it("legger inn grunnleie fra lokalet", () => {
    const venue = getVenue("kurland-menighetssenter")
    const line = lineById(BASE, "kurland-menighetssenter", "grunnleie")
    expect(line?.amount).toBe(venue.baseRate)
  })

  it("regner leietid per påbegynte time", () => {
    const venue = getVenue("kurland-menighetssenter")
    const twoHours = lineById(BASE, "kurland-menighetssenter", "tid")
    expect(twoHours?.amount).toBe(venue.hourlyRate * 2)

    const needs = { ...BASE, endTime: "20:30" }
    const rounded = lineById(needs, "kurland-menighetssenter", "tid")
    expect(rounded?.amount).toBe(venue.hourlyRate * 3)
  })
})

describe("rigg og rydding", () => {
  it("faktureres til halv timesats", () => {
    const venue = getVenue("kurland-menighetssenter")
    const halfRate = venue.hourlyRate * RATES.setupRateFactor
    expect(lineById(BASE, "kurland-menighetssenter", "rigg")?.amount).toBe(
      Math.round(halfRate * 1),
    )
    expect(lineById(BASE, "kurland-menighetssenter", "rydding")?.amount).toBe(
      Math.round(halfRate * 0.5),
    )
  })

  it("utelates helt når tiden er null", () => {
    const needs = { ...BASE, setupMinutes: 0, cleanupMinutes: 0 }
    expect(lineById(needs, "kurland-menighetssenter", "rigg")).toBeUndefined()
    expect(lineById(needs, "kurland-menighetssenter", "rydding")).toBeUndefined()
  })
})

describe("utstyr", () => {
  it("legger til bare utstyr lokalet faktisk har", () => {
    const needs: EventNeeds = {
      ...BASE,
      requiredFacilities: ["projektor", "piano"],
    }
    const estimate = calculatePrice(needs, "kurland-menighetssenter")
    const ids = estimate.lines.map((l) => l.id)
    expect(ids).toContain("utstyr-projektor")
    // Kurland menighetssenter har ikke piano, så det skal ikke faktureres.
    expect(ids).not.toContain("utstyr-piano")
  })
})

describe("renhold og bemanning", () => {
  it("øker renholdet med deltakerantallet", () => {
    const small = lineById(BASE, "greaker-menighetshus", "renhold")?.amount ?? 0
    const large = lineById(
      { ...BASE, expectedAttendees: 120 },
      "greaker-menighetshus",
      "renhold",
    )?.amount ?? 0
    expect(large).toBeGreaterThan(small)
  })

  it("legger til bemanning først over lokalets terskel", () => {
    expect(lineById(BASE, "greaker-menighetshus", "bemanning")).toBeUndefined()
    const staffed = lineById(
      { ...BASE, expectedAttendees: 150 },
      "greaker-menighetshus",
      "bemanning",
    )
    expect(staffed?.amount).toBeGreaterThan(0)
  })
})

describe("tillegg og rabatt", () => {
  it("legger til helgetillegg på lørdag", () => {
    expect(lineById(BASE, "greaker-menighetshus", "tillegg-helg")).toBeUndefined()
    const weekend = lineById({ ...BASE, date: SATURDAY }, "greaker-menighetshus", "tillegg-helg")
    expect(weekend?.amount).toBeGreaterThan(0)
  })

  it("legger til tillegg for forsterket lyd", () => {
    const line = lineById({ ...BASE, amplifiedMusic: true }, "greaker-menighetshus", "tillegg-lyd")
    expect(line?.amount).toBe(RATES.amplifiedSurcharge)
  })

  it("gir rabatt for ikke-kommersielle arrangement uten billettsalg", () => {
    const needs: EventNeeds = { ...BASE, eventType: "ovelse", ticketed: false }
    const line = lineById(needs, "kurland-menighetssenter", "rabatt-ideell")
    expect(line?.amount).toBeLessThan(0)
  })

  it("gir ikke rabatt når det selges billetter", () => {
    const needs: EventNeeds = { ...BASE, eventType: "ovelse", ticketed: true }
    expect(lineById(needs, "kurland-menighetssenter", "rabatt-ideell")).toBeUndefined()
  })
})

describe("totalsum og forklaringer", () => {
  it("summerer alle linjene", () => {
    const estimate = calculatePrice(BASE, "greaker-menighetshus")
    const sum = estimate.lines.reduce((acc, l) => acc + l.amount, 0)
    expect(estimate.total).toBe(Math.round(sum))
  })

  it("er aldri negativ", () => {
    const estimate = calculatePrice(BASE, "kurland-moterom", {
      adjustment: { amount: -999999, reason: "Test" },
    })
    expect(estimate.total).toBe(0)
  })

  it("gir hver linje en forklaring", () => {
    for (const line of calculatePrice(BASE, "greaker-menighetshus").lines) {
      expect(line.detail.length).toBeGreaterThan(10)
      expect(line.label.length).toBeGreaterThan(2)
    }
  })

  it("tar med saksbehandlerjustering som egen linje", () => {
    const estimate = calculatePrice(BASE, "greaker-menighetshus", {
      adjustment: { amount: -500, reason: "Menighetsrabatt etter avtale." },
    })
    const line = estimate.lines.find((l) => l.id === "justering")
    expect(line?.amount).toBe(-500)
    expect(line?.detail).toMatch(/Menighetsrabatt/)
  })

  it("varsler om billettinntekter", () => {
    const estimate = calculatePrice({ ...BASE, ticketed: true }, "greaker-menighetshus")
    expect(estimate.notes.join(" ")).toMatch(/billett/i)
  })
})
