import { describe, expect, it } from "vitest"

import { assessAvailability, getWeekday, isValidTimeRange } from "@/lib/availability"

// 2026-09-06 er en søndag, 2026-09-05 er en lørdag.
const SUNDAY = "2026-09-06"
const SATURDAY = "2026-09-05"

describe("tidsrom", () => {
  it("godtar sluttid etter starttid", () => {
    expect(isValidTimeRange("10:00", "12:00")).toBe(true)
  })

  it("avviser ugyldig tidsrom der sluttid er før eller lik starttid", () => {
    expect(isValidTimeRange("12:00", "10:00")).toBe(false)
    expect(isValidTimeRange("12:00", "12:00")).toBe(false)
  })

  it("avviser ugyldig format", () => {
    expect(isValidTimeRange("25:00", "26:00")).toBe(false)
    expect(isValidTimeRange("", "12:00")).toBe(false)
  })

  it("markerer ugyldig tidsrom som «Må avklares»", () => {
    const result = assessAvailability({ date: SATURDAY, startTime: "14:00", endTime: "12:00" })
    expect(result.status).toBe("review")
    expect(result.reason).toMatch(/Sluttid må være etter starttid/)
  })
})

describe("ukedag", () => {
  it("finner riktig ukedag uten tidssoneforskyvning", () => {
    expect(getWeekday(SUNDAY)).toBe(0)
    expect(getWeekday(SATURDAY)).toBe(6)
  })

  it("returnerer null for ugyldige datoer", () => {
    expect(getWeekday("2026-02-30")).toBeNull()
    expect(getWeekday("ikke-en-dato")).toBeNull()
  })
})

describe("indikativ tilgjengelighet", () => {
  it("gir mulig konflikt på søndag mellom 09 og 14", () => {
    const result = assessAvailability({ date: SUNDAY, startTime: "10:00", endTime: "12:00" })
    expect(result.status).toBe("conflict")
    expect(result.label).toBe("Mulig konflikt")
  })

  it("gir mulig konflikt når tidsrommet delvis overlapper gudstjenestetiden", () => {
    expect(
      assessAvailability({ date: SUNDAY, startTime: "13:00", endTime: "16:00" }).status,
    ).toBe("conflict")
  })

  it("ser ledig ut på søndag ettermiddag", () => {
    const result = assessAvailability({ date: SUNDAY, startTime: "15:00", endTime: "18:00" })
    expect(result.status).toBe("likely")
    expect(result.label).toBe("Ser ledig ut")
  })

  it("må avklares før klokken 08", () => {
    expect(
      assessAvailability({ date: SATURDAY, startTime: "07:00", endTime: "09:00" }).status,
    ).toBe("review")
  })

  it("må avklares etter klokken 23", () => {
    expect(
      assessAvailability({ date: SATURDAY, startTime: "21:00", endTime: "23:30" }).status,
    ).toBe("review")
  })

  it("ser ledig ut på en vanlig lørdag kveld", () => {
    expect(
      assessAvailability({ date: SATURDAY, startTime: "18:00", endTime: "21:00" }).status,
    ).toBe("likely")
  })
})
