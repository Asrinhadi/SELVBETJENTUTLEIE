import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import { buildDemoCalendar } from "@/data/calendar"
import { createInitialState, kirkeflowReducer } from "@/context/kirkeflowReducer"
import { assessComplexity, findMissingInfo } from "@/domain/complexity"
import {
  approveCase,
  buildCaseNumber,
  buildEffectiveCalendar,
  casesToBookings,
  createCase,
  hasCalendarConflict,
  refreshCase,
  rejectCase,
} from "@/domain/caseflow"
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
  phone: "900 00 100",
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

describe("dobbeltbooking mot systemets egne saker", () => {
  const SLOT: EventNeeds = {
    ...NEEDS,
    date: toIsoDate(addDays(NOW, 12)),
    startTime: "18:00",
    endTime: "20:00",
    setupMinutes: 60,
    cleanupMinutes: 30,
    requiredFacilities: [],
  }

  it("gir ledig når ingen har spurt om lokalet ennå", () => {
    const first = createCase(
      { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
      300,
      NOW,
    )
    expect(first.availability.state).toBe("ledig")
  })

  it("oppdager en identisk forespørsel som allerede ligger i systemet", () => {
    const first = createCase(
      { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
      300,
      NOW,
    )
    const second = createCase(
      {
        needs: SLOT,
        venueId: "greaker-menighetshus",
        applicant: APPLICANT,
        calendar: buildEffectiveCalendar(CALENDAR, [first]),
      },
      301,
      NOW,
    )
    expect(second.availability.state).not.toBe("ledig")
    expect(second.availability.conflicts.length).toBeGreaterThan(0)
    expect(second.availability.conflicts[0]?.title).toContain(first.caseNumber)
  })

  it("blokkerer også når bare klargjøringstiden overlapper", () => {
    const first = createCase(
      { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
      300,
      NOW,
    )
    // Første sak blokkerer 17:00–20:30. Denne slutter 17:30.
    const overlapping: EventNeeds = {
      ...SLOT,
      startTime: "15:00",
      endTime: "17:30",
      setupMinutes: 0,
      cleanupMinutes: 0,
    }
    const second = createCase(
      {
        needs: overlapping,
        venueId: "greaker-menighetshus",
        applicant: APPLICANT,
        calendar: buildEffectiveCalendar(CALENDAR, [first]),
      },
      301,
      NOW,
    )
    expect(second.availability.conflicts.length).toBeGreaterThan(0)
  })

  it("ser bort fra avslåtte saker", () => {
    const first = rejectCase(
      createCase(
        { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
        300,
        NOW,
      ),
      "Ikke aktuelt.",
      "Anne Lie",
      NOW,
    )
    expect(buildEffectiveCalendar(CALENDAR, [first])).toHaveLength(CALENDAR.length)
  })

  it("regner en godkjent sak som bekreftet og en uavgjort som foreløpig", () => {
    const pending = createCase(
      { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
      300,
      NOW,
    )
    expect(casesToBookings([pending])[0]?.kind).toBe("forelopig")
    expect(casesToBookings([approveCase(pending, "Anne Lie", NOW)])[0]?.kind).toBe("bekreftet")
  })

  it("sperrer godkjenning av sak nummer to selv om lagret tilstand sa ledig", () => {
    let state = createInitialState(NOW)
    const at = NOW.toISOString()

    const first = createCase(
      {
        needs: SLOT,
        venueId: "greaker-menighetshus",
        applicant: APPLICANT,
        calendar: buildEffectiveCalendar(state.calendar, state.cases),
      },
      state.nextSequence,
      NOW,
    )
    state = kirkeflowReducer(state, { type: "case/created", request: first })

    const second = createCase(
      {
        needs: SLOT,
        venueId: "greaker-menighetshus",
        applicant: APPLICANT,
        calendar: buildEffectiveCalendar(state.calendar, state.cases),
      },
      state.nextSequence,
      NOW,
    )
    state = kirkeflowReducer(state, { type: "case/created", request: second })

    // Den FØRSTE saken ble lagret med «ledig», men er nå i konflikt med den andre.
    const approved = kirkeflowReducer(state, {
      type: "case/approved",
      caseId: first.id,
      staffName: "Anne Lie",
      at,
    }).cases.find((c) => c.id === first.id)

    expect(approved?.status).not.toBe("godkjent")
    expect(approved?.status).not.toBe("venter_betaling")
  })

  it("teller ikke saken som konflikt med seg selv", () => {
    const first = createCase(
      { needs: SLOT, venueId: "greaker-menighetshus", applicant: APPLICANT, calendar: CALENDAR },
      300,
      NOW,
    )
    const refreshed = refreshCase(first, CALENDAR, [first])
    expect(refreshed.availability.state).toBe("ledig")
  })
})

describe("kalenderkonflikt blokkerer godkjenning", () => {
  /** Legger arrangementet oppå en bekreftet booking i demokalenderen. */
  function conflictingCase() {
    const conflict = CALENDAR.find((b) => b.kind === "bekreftet")
    if (!conflict) throw new Error("Forventet en bekreftet booking i demokalenderen")
    const needs: EventNeeds = {
      ...NEEDS,
      date: conflict.date,
      startTime: conflict.start,
      endTime: conflict.end,
      requiredFacilities: [],
    }
    return createCase(
      { needs, venueId: conflict.venueId, applicant: APPLICANT, calendar: CALENDAR },
      200,
      NOW,
    )
  }

  it("oppdager konflikten", () => {
    const request = conflictingCase()
    expect(hasCalendarConflict(request)).toBe(true)
    expect(request.availability.state).toBe("opptatt")
  })

  it("nekter godkjenning uten begrunnelse", () => {
    const request = conflictingCase()
    const attempted = approveCase(request, "Anne Lie", NOW)
    expect(attempted).toBe(request)
    expect(attempted.status).not.toBe("godkjent")
    expect(attempted.status).not.toBe("venter_betaling")
  })

  it("tillater overstyring med begrunnelse, og fører den i loggen", () => {
    const request = conflictingCase()
    const approved = approveCase(
      request,
      "Anne Lie",
      NOW,
      "Den andre oppføringen er avlyst og fjernes i dag.",
    )
    expect(approved.status).toBe("venter_betaling")
    const override = approved.events.find((e) => e.type === "konflikt_overstyrt")
    expect(override).toBeDefined()
    expect(override?.actor).toBe("Anne Lie")
    expect(override?.message).toMatch(/avlyst/)
  })

  it("saker uten konflikt godkjennes som før", () => {
    const request = createCase(
      { needs: NEEDS, venueId: "hafslund-menighetssal", applicant: APPLICANT, calendar: CALENDAR },
      201,
      NOW,
    )
    expect(hasCalendarConflict(request)).toBe(false)
    expect(approveCase(request, "Anne Lie", NOW).status).toBe("venter_betaling")
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
