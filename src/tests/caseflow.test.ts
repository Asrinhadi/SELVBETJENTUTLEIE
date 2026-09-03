import { describe, expect, it } from "vitest"

import type { RentalRequestInput } from "@/domain/rental"
import { DEMO_NEXT_SEQUENCE } from "@/data/demoData"
import { approveRequest, createRentalRequest } from "@/lib/caseflow"
import { createInitialState, rentalReducer } from "@/context/rentalReducer"

const INPUT: RentalRequestInput = {
  buildingId: "tune",
  date: "2026-10-24",
  startTime: "18:00",
  endTime: "21:00",
  purposeId: "concert_free",
  description: "Høstkonsert med lokalt kor og strykere.",
  applicant: {
    name: "Kari Nordmann",
    email: "kari.nordmann@example.com",
    phone: "912 34 567",
  },
}

const NOW = new Date("2026-09-03T10:00:00.000Z")

describe("opprettelse av sak", () => {
  it("lager referansenummer, status new og en hendelse i historikken", () => {
    const request = createRentalRequest(INPUT, 42, NOW)
    expect(request.reference).toBe("UTL-2026-042")
    expect(request.status).toBe("new")
    expect(request.tasks).toHaveLength(0)
    expect(request.history).toHaveLength(1)
    expect(request.history[0]?.type).toBe("submitted")
    expect(request.confirmationCreated).toBe(false)
  })
})

describe("godkjenning", () => {
  it("oppretter automatisk tre oppgaver, markerer bekreftelse og skriver historikk", () => {
    const request = createRentalRequest(INPUT, 42, NOW)
    const approved = approveRequest(request, NOW)

    expect(approved.status).toBe("approved")
    expect(approved.confirmationCreated).toBe(true)
    expect(approved.tasks).toHaveLength(3)
    expect(approved.tasks.map((t) => t.type)).toEqual(["contract", "invoice", "keys"])
    expect(approved.tasks.map((t) => t.title)).toEqual([
      "Klargjør og send kontrakt",
      "Opprett fakturagrunnlag",
      "Avtal utlevering av nøkler",
    ])
    expect(approved.tasks.every((t) => !t.completed)).toBe(true)
    expect(approved.tasks.every((t) => t.responsibleRole.length > 0)).toBe(true)
    expect(approved.tasks.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate))).toBe(true)

    const types = approved.history.map((e) => e.type)
    expect(types).toEqual(["submitted", "approved", "confirmation_created", "tasks_created"])
  })

  it("setter frist for nøkler to dager før arrangementet", () => {
    const approved = approveRequest(createRentalRequest(INPUT, 42, NOW), NOW)
    const keys = approved.tasks.find((t) => t.type === "keys")
    expect(keys?.dueDate).toBe("2026-10-22")
  })

  it("er idempotent – dobbel godkjenning lager ikke flere oppgaver", () => {
    const once = approveRequest(createRentalRequest(INPUT, 42, NOW), NOW)
    const twice = approveRequest(once, NOW)
    expect(twice).toBe(once)
    expect(twice.tasks).toHaveLength(3)
  })
})

describe("reducer", () => {
  it("legger ny sak først i innboksen og øker løpenummeret", () => {
    const state = createInitialState()
    const request = createRentalRequest(INPUT, state.nextSequence, NOW)
    const next = rentalReducer(state, { type: "request/submitted", request })

    expect(next.requests[0]?.reference).toBe(`UTL-2026-0${DEMO_NEXT_SEQUENCE}`)
    expect(next.nextSequence).toBe(DEMO_NEXT_SEQUENCE + 1)
    expect(next.requests).toHaveLength(state.requests.length + 1)
  })

  it("godkjenner via reducer og oppretter tre oppgaver", () => {
    const state = createInitialState()
    const target = state.requests.find((r) => r.status === "new")
    expect(target).toBeDefined()
    if (!target) return

    const next = rentalReducer(state, {
      type: "request/approved",
      requestId: target.id,
      at: NOW.toISOString(),
    })
    const updated = next.requests.find((r) => r.id === target.id)
    expect(updated?.status).toBe("approved")
    expect(updated?.tasks).toHaveLength(3)
  })

  it("avslår med begrunnelse og ber om mer informasjon", () => {
    const state = createInitialState()
    const target = state.requests.find((r) => r.status === "new")
    if (!target) throw new Error("Forventet en ny sak i demo-dataene")

    const rejected = rentalReducer(state, {
      type: "request/rejected",
      requestId: target.id,
      reason: "Opptatt.",
      at: NOW.toISOString(),
    }).requests.find((r) => r.id === target.id)
    expect(rejected?.status).toBe("rejected")
    expect(rejected?.history.at(-1)?.message).toContain("Opptatt.")

    const needsInfo = rentalReducer(state, {
      type: "request/infoRequested",
      requestId: target.id,
      message: "Hvor mange kommer?",
      at: NOW.toISOString(),
    }).requests.find((r) => r.id === target.id)
    expect(needsInfo?.status).toBe("needs_info")
    expect(needsInfo?.history.at(-1)?.type).toBe("info_requested")
  })

  it("markerer oppgaver som ferdige og gjenåpner dem", () => {
    const state = createInitialState()
    const approved = state.requests.find((r) => r.status === "approved")
    const openTask = approved?.tasks.find((t) => !t.completed)
    if (!approved || !openTask) throw new Error("Forventet en godkjent sak med åpen oppgave")

    const done = rentalReducer(state, {
      type: "task/toggled",
      requestId: approved.id,
      taskId: openTask.id,
      completed: true,
      at: NOW.toISOString(),
    })
    const updated = done.requests.find((r) => r.id === approved.id)
    expect(updated?.tasks.find((t) => t.id === openTask.id)?.completed).toBe(true)
    expect(updated?.history.at(-1)?.type).toBe("task_completed")
  })

  it("nullstiller til de opprinnelige demo-sakene", () => {
    const state = createInitialState()
    const request = createRentalRequest(INPUT, state.nextSequence, NOW)
    const changed = rentalReducer(state, { type: "request/submitted", request })
    const reset = rentalReducer(changed, { type: "demo/reset" })
    expect(reset.requests).toHaveLength(state.requests.length)
    expect(reset.nextSequence).toBe(DEMO_NEXT_SEQUENCE)
  })
})
