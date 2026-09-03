import { describe, expect, it } from "vitest"

import {
  assessAvailability,
  calculateBlockedWindow,
  type CalendarBooking,
} from "@/domain/availabilityEngine"
import type { EventNeeds } from "@/domain/event"

/** 2026-09-08 er en tirsdag, 2026-09-13 er en søndag. */
const TUESDAY = "2026-09-08"
const SUNDAY = "2026-09-13"

const NEEDS: EventNeeds = {
  eventType: "kulturarrangement",
  description: "Foredrag.",
  expectedAttendees: 40,
  date: TUESDAY,
  startTime: "18:00",
  endTime: "20:00",
  setupMinutes: 60,
  cleanupMinutes: 30,
  requiredFacilities: [],
  otherNeeds: "",
  amplifiedMusic: false,
}

const EMPTY: readonly CalendarBooking[] = []

describe("blokkert tidsrom", () => {
  it("trekker fra riggetid og legger til ryddetid", () => {
    const window = calculateBlockedWindow({
      startTime: "18:00",
      endTime: "20:00",
      setupMinutes: 60,
      cleanupMinutes: 30,
    })
    expect(window?.from).toBe("17:00")
    expect(window?.to).toBe("20:30")
  })

  it("returnerer null for ugyldig tidsrom", () => {
    expect(
      calculateBlockedWindow({
        startTime: "20:00",
        endTime: "18:00",
        setupMinutes: 0,
        cleanupMinutes: 0,
      }),
    ).toBeNull()
  })
})

describe("tilgjengelighet", () => {
  it("er ledig uten konflikter", () => {
    const slot = assessAvailability(NEEDS, "greaker-menighetshus", EMPTY)
    expect(slot.state).toBe("ledig")
    expect(slot.blockedFrom).toBe("17:00")
    expect(slot.blockedTo).toBe("20:30")
  })

  it("er opptatt ved overlapp med bekreftet booking", () => {
    const calendar: CalendarBooking[] = [
      {
        id: "b1",
        venueId: "greaker-menighetshus",
        date: TUESDAY,
        start: "19:00",
        end: "21:00",
        title: "Konfirmantsamling",
        kind: "bekreftet",
      },
    ]
    const slot = assessAvailability(NEEDS, "greaker-menighetshus", calendar)
    expect(slot.state).toBe("opptatt")
    expect(slot.conflicts).toHaveLength(1)
  })

  it("fanger konflikt som bare overlapper riggetiden", () => {
    const calendar: CalendarBooking[] = [
      {
        id: "b2",
        venueId: "greaker-menighetshus",
        date: TUESDAY,
        start: "16:00",
        end: "17:30",
        title: "Møte",
        kind: "bekreftet",
      },
    ]
    const slot = assessAvailability(NEEDS, "greaker-menighetshus", calendar)
    expect(slot.state).toBe("opptatt")
  })

  it("skiller foreløpig reservasjon fra bekreftet", () => {
    const calendar: CalendarBooking[] = [
      {
        id: "b3",
        venueId: "greaker-menighetshus",
        date: TUESDAY,
        start: "19:00",
        end: "21:00",
        title: "Korøvelse",
        kind: "forelopig",
      },
    ]
    expect(assessAvailability(NEEDS, "greaker-menighetshus", calendar).state).toBe(
      "forelopig_reservert",
    )
  })

  it("krever vurdering utenfor kl. 08–23", () => {
    const needs = { ...NEEDS, startTime: "07:30", endTime: "09:00", setupMinutes: 0 }
    expect(assessAvailability(needs, "greaker-menighetshus", EMPTY).state).toBe(
      "krever_vurdering",
    )
  })

  it("krever vurdering søndag formiddag", () => {
    const needs = { ...NEEDS, date: SUNDAY, startTime: "10:00", endTime: "12:00" }
    expect(assessAvailability(needs, "greaker-menighetshus", EMPTY).state).toBe(
      "krever_vurdering",
    )
  })

  it("krever vurdering for forsterket musikk i kirkerommet", () => {
    const needs = { ...NEEDS, amplifiedMusic: true }
    expect(assessAvailability(needs, "tune-kirke", EMPTY).state).toBe("krever_vurdering")
  })

  it("kan forespørres ved kort tid til neste arrangement", () => {
    const calendar: CalendarBooking[] = [
      {
        id: "b4",
        venueId: "greaker-menighetshus",
        date: TUESDAY,
        start: "21:00",
        end: "22:00",
        title: "Annet arrangement",
        kind: "bekreftet",
      },
    ]
    expect(assessAvailability(NEEDS, "greaker-menighetshus", calendar).state).toBe(
      "kan_forespores",
    )
  })

  it("ignorerer bookinger i andre lokaler", () => {
    const calendar: CalendarBooking[] = [
      {
        id: "b5",
        venueId: "tune-kirke",
        date: TUESDAY,
        start: "18:00",
        end: "20:00",
        title: "Øvelse",
        kind: "bekreftet",
      },
    ]
    expect(assessAvailability(NEEDS, "greaker-menighetshus", calendar).state).toBe("ledig")
  })
})
