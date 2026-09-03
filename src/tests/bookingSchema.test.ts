import { describe, expect, it } from "vitest"

import {
  bookingSchema,
  parseRevenue,
  toRentalRequestInput,
  type BookingFormValues,
} from "@/lib/bookingSchema"

const VALID: BookingFormValues = {
  buildingId: "sarpsborg",
  date: "2026-10-10",
  startTime: "18:00",
  endTime: "21:00",
  purposeId: "concert_free",
  estimatedTicketRevenue: "",
  name: "Kari Nordmann",
  organization: "",
  email: "kari.nordmann@example.com",
  phone: "912 34 567",
  description: "En hyggelig konsert for hele familien.",
  confirmRequestOnly: true,
}

function issuesForAll(values: BookingFormValues): string[] {
  const result = bookingSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.path.join("."))
}

function issuesFor(values: BookingFormValues, path: string): string[] {
  const result = bookingSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path.join(".") === path)
    .map((issue) => issue.message)
}

describe("skjemavalidering", () => {
  it("godtar et komplett skjema", () => {
    expect(bookingSchema.safeParse(VALID).success).toBe(true)
  })

  it("viser alle feil samtidig, også kryssfelt-feil, når flere felt mangler", () => {
    const paths = issuesForAll({
      ...VALID,
      buildingId: "",
      purposeId: "",
      startTime: "20:00",
      endTime: "18:00",
      confirmRequestOnly: false,
    })
    expect(paths).toContain("buildingId")
    expect(paths).toContain("purposeId")
    expect(paths).toContain("endTime")
    expect(paths).toContain("confirmRequestOnly")
  })

  it("avviser ukjente id-er", () => {
    expect(issuesFor({ ...VALID, buildingId: "ukjent" }, "buildingId")).toContain("Ukjent bygg.")
    expect(() => toRentalRequestInput({ ...VALID, buildingId: "ukjent" })).toThrow()
  })

  it("avviser ugyldig tidsrom", () => {
    expect(issuesFor({ ...VALID, startTime: "20:00", endTime: "18:00" }, "endTime")).toContain(
      "Sluttid må være etter starttid.",
    )
  })

  it("avviser ugyldig e-post", () => {
    expect(issuesFor({ ...VALID, email: "ikke-en-epost" }, "email").length).toBeGreaterThan(0)
  })

  it("krever minst åtte tegn i telefonnummer", () => {
    expect(issuesFor({ ...VALID, phone: "1234567" }, "phone").length).toBeGreaterThan(0)
    expect(issuesFor({ ...VALID, phone: "12345678" }, "phone")).toHaveLength(0)
  })

  it("krever beskrivelse mellom 10 og 600 tegn", () => {
    expect(issuesFor({ ...VALID, description: "For kort" }, "description").length).toBeGreaterThan(0)
    expect(
      issuesFor({ ...VALID, description: "x".repeat(601) }, "description").length,
    ).toBeGreaterThan(0)
    expect(issuesFor({ ...VALID, description: "x".repeat(600) }, "description")).toHaveLength(0)
  })

  it("krever bekreftelse på at dette bare er en forespørsel", () => {
    expect(issuesFor({ ...VALID, confirmRequestOnly: false }, "confirmRequestOnly")).toContain(
      "Du må bekrefte at dette bare er en forespørsel.",
    )
  })

  it("krever billettinntekt når formålet er konsert med billettinntekter", () => {
    expect(
      issuesFor({ ...VALID, purposeId: "concert_ticketed" }, "estimatedTicketRevenue").length,
    ).toBeGreaterThan(0)
    expect(
      issuesFor(
        { ...VALID, purposeId: "concert_ticketed", estimatedTicketRevenue: "40 000" },
        "estimatedTicketRevenue",
      ),
    ).toHaveLength(0)
  })

  it("tolker beløp med mellomrom og punktum", () => {
    expect(parseRevenue("40 000")).toBe(40000)
    expect(parseRevenue("40.000")).toBe(40000)
    expect(parseRevenue("")).toBeNull()
    expect(parseRevenue("abc")).toBeNull()
  })

  it("konverterer skjemaverdier til typesikker input", () => {
    const input = toRentalRequestInput({
      ...VALID,
      purposeId: "concert_ticketed",
      estimatedTicketRevenue: "42 000",
      organization: "  Borg vokalensemble ",
    })
    expect(input.estimatedTicketRevenue).toBe(42000)
    expect(input.applicant.organization).toBe("Borg vokalensemble")

    const withoutOrg = toRentalRequestInput(VALID)
    expect(withoutOrg.applicant.organization).toBeUndefined()
    expect(withoutOrg.estimatedTicketRevenue).toBeUndefined()
  })
})
