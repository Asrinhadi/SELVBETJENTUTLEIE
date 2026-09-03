import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import { buildDemoCalendar } from "@/data/calendar"
import { createInitialState, kirkeflowReducer } from "@/context/kirkeflowReducer"
import { assessComplexity, findMissingInfo } from "@/domain/complexity"
import { approveCase, buildCaseNumber, createCase } from "@/domain/caseflow"
import { assessAvailability } from "@/domain/availabilityEngine"
import { evaluateVenue } from "@/domain/suitabilityEngine"
import type { EventNeeds } from "@/domain/event"
import { getVenue } from "@/domain/venue"
import { toIsoDate } from "@/lib/dates"

const NOW = new Date("2026-09-08T10:00:00.000Z")
const CALENDAR = buildDemoCalendar(NOW)

const NEEDS: EventNeeds = {
  eventType: "ovelse",
  description: "Ukentlig korøvelse fram mot vårkonserten, uten publikum.",
  expectedAttendees: 25,
  date: toIsoDate(addDays(NOW, 10)),
  startTime: "19:00",
  endTime: "21:00",
  setupMinutes: 15,
  cleanupMinutes: 15,
  requiredFacilities: ["piano"],
  otherNeeds: "",
}

const APPLICANT = {
  name: "Kari Nordmann",
  email: "kari.nordmann@example.com",
  phone: "912 34 567",
}

describe("saksnummer", () => {
  it("bruker formatet KIR-år-løpenummer", () => {
    expect(buildCaseNumber(2026, 147)).toBe("KIR-2026-0147")
  })
})

describe("opprettelse av sak", () => {
  it("kjører alle motorene og skriver to hendelser", () => {
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: CALENDAR },
      147,
      NOW,
    )
    expect(request.caseNumber).toBe("KIR-2026-0147")
    expect(request.events).toHaveLength(2)
    expect(request.events[0]?.type).toBe("opprettet")
    expect(request.events[1]?.type).toBe("automatisk_kontroll")
    expect(request.price.total).toBeGreaterThan(0)
    expect(request.suitability.reasons.length).toBeGreaterThan(0)
    expect(request.recommendedVenueIds.length).toBeGreaterThan(0)
  })

  it("setter enkle saker rett til automatisk kontroll", () => {
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: CALENDAR },
      147,
      NOW,
    )
    expect(request.status).toBe("automatisk_kontroll")
    expect(request.complexity.level).toBe("lav")
  })

  it("sender sammensatte saker til manuell vurdering", () => {
    const needs: EventNeeds = {
      ...NEEDS,
      eventType: "konsert",
      expectedAttendees: 260,
      amplifiedMusic: true,
      ticketed: true,
      requiredFacilities: ["lydanlegg", "universell_adkomst"],
    }
    const request = createCase(
      { needs, venueId: "sarpsborg-kirke", applicant: APPLICANT, calendar: CALENDAR },
      148,
      NOW,
    )
    expect(request.status).toBe("venter_vurdering")
    expect(request.complexity.level).toBe("hoy")
  })
})

describe("godkjenning", () => {
  it("går via godkjent til venter på betaling", () => {
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: CALENDAR },
      147,
      NOW,
    )
    const approved = approveCase(request, "Anne Lie", NOW)
    expect(approved.status).toBe("venter_betaling")
    const types = approved.events.map((e) => e.type)
    expect(types).toContain("godkjent")
    expect(approved.events.some((e) => e.toStatus === "venter_betaling")).toBe(true)
  })

  it("er idempotent", () => {
    const request = approveCase(
      createCase(
        { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: CALENDAR },
        147,
        NOW,
      ),
      "Anne Lie",
      NOW,
    )
    // Saken står nå på venter_betaling, og godkjenning skal ikke kjøre på nytt.
    const before = request.events.length
    expect(approveCase(request, "Anne Lie", NOW).events.length).toBe(before + 2)
  })
})

describe("kompleksitet", () => {
  it("forklarer alltid nivået med minst én faktor", () => {
    const suitability = evaluateVenue(NEEDS, getVenue("hafslund-menighetssal"))
    const availability = assessAvailability(NEEDS, "hafslund-menighetssal", CALENDAR)
    const assessment = assessComplexity({
      needs: NEEDS,
      venueId: "hafslund-menighetssal",
      suitability,
      availability,
      missingInfo: [],
    })
    expect(assessment.factors.length).toBeGreaterThan(0)
    expect(["lav", "middels", "hoy"]).toContain(assessment.level)
  })

  it("finner manglende informasjon ved kort beskrivelse", () => {
    const missing = findMissingInfo({ ...NEEDS, description: "Kort" })
    expect(missing.join(" ")).toMatch(/beskrivelse/i)
  })
})

describe("reducer", () => {
  it("legger nye saker først og øker løpenummeret", () => {
    const state = createInitialState(NOW)
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: state.calendar },
      state.nextSequence,
      NOW,
    )
    const next = kirkeflowReducer(state, { type: "case/created", request })
    expect(next.cases[0]?.id).toBe(request.id)
    expect(next.nextSequence).toBe(state.nextSequence + 1)
  })

  it("behandler tildeling, avslag og prisjustering", () => {
    const state = createInitialState(NOW)
    const target = state.cases.find((c) => c.status === "venter_vurdering")
    if (!target) throw new Error("Forventet en sak til vurdering i demodataene")
    const at = NOW.toISOString()

    const assigned = kirkeflowReducer(state, {
      type: "case/assigned",
      caseId: target.id,
      staffId: "sb-1",
      staffName: "Anne Lie",
      at,
    }).cases.find((c) => c.id === target.id)
    expect(assigned?.assignedTo).toBe("sb-1")

    const rejected = kirkeflowReducer(state, {
      type: "case/rejected",
      caseId: target.id,
      reason: "Ikke forenlig med bruken.",
      staffName: "Anne Lie",
      at,
    }).cases.find((c) => c.id === target.id)
    expect(rejected?.status).toBe("avslatt")

    const adjusted = kirkeflowReducer(state, {
      type: "case/priceAdjusted",
      caseId: target.id,
      amount: -500,
      reason: "Menighetsrabatt.",
      staffName: "Anne Lie",
      at,
    }).cases.find((c) => c.id === target.id)
    expect(adjusted?.price.lines.some((l) => l.id === "justering")).toBe(true)
  })

  it("setter saken tilbake til vurdering når søker svarer", () => {
    const state = createInitialState(NOW)
    const waiting = state.cases.find((c) => c.status === "tilleggsinfo_etterspurt")
    if (!waiting) throw new Error("Forventet en sak som venter på søker")

    const replied = kirkeflowReducer(state, {
      type: "case/applicantReplied",
      caseId: waiting.id,
      body: "Vi trenger storkjøkkenet og bord til alle 45.",
      at: NOW.toISOString(),
    }).cases.find((c) => c.id === waiting.id)

    expect(replied?.status).toBe("venter_vurdering")
    expect(replied?.messages.at(-1)?.from).toBe("soker")
  })

  it("tilbakestiller demoen", () => {
    const state = createInitialState(NOW)
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: state.calendar },
      state.nextSequence,
      NOW,
    )
    const changed = kirkeflowReducer(state, { type: "case/created", request })
    const reset = kirkeflowReducer(changed, { type: "demo/reset" })
    expect(reset.cases).toHaveLength(state.cases.length)
  })
})
