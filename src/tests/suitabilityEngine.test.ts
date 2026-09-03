import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import type { EventNeeds } from "@/domain/event"
import { evaluateVenue, rankVenues } from "@/domain/suitabilityEngine"
import { getVenue } from "@/domain/venue"
import { toIsoDate } from "@/lib/dates"

const FUTURE = toIsoDate(addDays(new Date(), 21))

/** Eksempelet fra kravspesifikasjonen: alkoholfri konsert for 150 med piano og adkomst. */
const CONCERT: EventNeeds = {
  eventType: "konsert",
  description: "Alkoholfri konsert med kor og strykere.",
  expectedAttendees: 150,
  date: FUTURE,
  startTime: "18:00",
  endTime: "20:00",
  setupMinutes: 60,
  cleanupMinutes: 30,
  requiredFacilities: ["piano", "universell_adkomst"],
  otherNeeds: "",
  amplifiedMusic: false,
  ticketed: false,
  needsStage: false,
  publicEvent: true,
}

describe("kapasitetsregelen", () => {
  it("gir ikke egnet når lokalet er for lite", () => {
    const result = evaluateVenue(CONCERT, getVenue("kurland-moterom"))
    expect(result.verdict).toBe("ikke_egnet")
    expect(result.score).toBe(0)
    expect(result.missingRequirements.some((m) => m.includes("Kapasitet"))).toBe(true)
  })

  it("advarer når antallet er over sitteplassene, men under maks", () => {
    const needs = { ...CONCERT, expectedAttendees: 90 }
    const result = evaluateVenue(needs, getVenue("hafslund-menighetssal"))
    expect(result.requiresManualApproval).toBe(true)
    expect(result.warnings.join(" ")).toMatch(/sitteplasser/)
  })

  it("gir god match når kapasiteten passer og behovene dekkes", () => {
    const result = evaluateVenue(CONCERT, getVenue("sarpsborg-kirke"))
    expect(result.verdict).toBe("god_match")
    expect(result.missingRequirements).toHaveLength(0)
    expect(result.score).toBeGreaterThanOrEqual(85)
  })
})

describe("fasilitetsregelen", () => {
  it("registrerer manglende universell adkomst som en mangel", () => {
    const result = evaluateVenue(CONCERT, getVenue("skjeberg-kirke"))
    expect(result.missingRequirements.join(" ")).toMatch(/universell adkomst/i)
    expect(result.verdict).not.toBe("god_match")
  })

  it("nevner fasilitetene som faktisk finnes", () => {
    const result = evaluateVenue(CONCERT, getVenue("sarpsborg-kirke"))
    const positive = result.reasons.filter((r) => r.kind === "positiv").map((r) => r.text)
    expect(positive.join(" ").toLowerCase()).toMatch(/piano/)
  })
})

describe("regler for kirkerom", () => {
  it("blokkerer alkoholservering i kirkerommet", () => {
    const needs: EventNeeds = {
      ...CONCERT,
      eventType: "selskap",
      expectedAttendees: 60,
      requiredFacilities: [],
      servingFood: true,
      servingAlcohol: true,
    }
    const result = evaluateVenue(needs, getVenue("tune-kirke"))
    expect(result.verdict).toBe("ikke_egnet")
    expect(result.missingRequirements.join(" ")).toMatch(/[Aa]lkohol/)
  })

  it("krever manuell vurdering for forsterket musikk i kirkerommet", () => {
    const needs = { ...CONCERT, amplifiedMusic: true }
    const result = evaluateVenue(needs, getVenue("tune-kirke"))
    expect(result.requiresManualApproval).toBe(true)
    expect(result.verdict).toBe("ma_vurderes")
  })

  it("godtar forsterket musikk i menighetshuset uten ekstra vurdering", () => {
    const needs = {
      ...CONCERT,
      expectedAttendees: 90,
      amplifiedMusic: true,
      requiredFacilities: ["lydanlegg" as const, "universell_adkomst" as const],
    }
    const result = evaluateVenue(needs, getVenue("greaker-menighetshus"))
    expect(result.warnings.join(" ")).not.toMatch(/lydnivå/i)
  })

  it("markerer møte i kirkerommet som avvik fra normal bruk", () => {
    const needs: EventNeeds = {
      ...CONCERT,
      eventType: "mote",
      expectedAttendees: 20,
      requiredFacilities: [],
    }
    const result = evaluateVenue(needs, getVenue("tune-kirke"))
    expect(result.warnings.join(" ")).toMatch(/normale bruk/)
    expect(result.verdict).toBe("ma_vurderes")
  })
})

describe("bemanningsregelen", () => {
  it("krever bemanning over lokalets terskel", () => {
    const needs = { ...CONCERT, expectedAttendees: 260, requiredFacilities: [] }
    const result = evaluateVenue(needs, getVenue("sarpsborg-kirke"))
    expect(result.warnings.join(" ")).toMatch(/bemanning/)
    expect(result.requiresManualApproval).toBe(true)
  })
})

describe("rangering", () => {
  it("sorterer god match først og ikke egnet sist", () => {
    const ranked = rankVenues(CONCERT)
    expect(ranked[0]?.verdict).toBe("god_match")
    expect(ranked.at(-1)?.verdict).toBe("ikke_egnet")
    expect(ranked).toHaveLength(7)
  })

  it("gir hvert lokale en begrunnelse", () => {
    for (const result of rankVenues(CONCERT)) {
      expect(result.reasons.length).toBeGreaterThan(0)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })
})
