import { addDays, subDays } from "date-fns"
import { describe, expect, it } from "vitest"

import {
  PAST_DATE_MESSAGE,
  bookingSchema,
  createBookingSchema,
  parseRevenue,
  toRentalRequestInput,
  type BookingFormValues,
} from "@/lib/bookingSchema"
import { isBeforeDay, toIsoDate, todayIsoDate } from "@/lib/dates"

const VALID: BookingFormValues = {
  buildingId: "sarpsborg",
  // Alltid en fremtidig dato, uansett når testene kjøres.
  date: toIsoDate(addDays(new Date(), 30)),
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

type Schema = ReturnType<typeof createBookingSchema>

function issuesForAll(values: BookingFormValues, schema: Schema = bookingSchema): string[] {
  const result = schema.safeParse(values)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.path.join("."))
}

function issuesFor(
  values: BookingFormValues,
  path: string,
  schema: Schema = bookingSchema,
): string[] {
  const result = schema.safeParse(values)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path.join(".") === path)
    .map((issue) => issue.message)
}

describe("datohjelpere", () => {
  it("beregner dagens dato dynamisk på formatet yyyy-MM-dd", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(todayIsoDate()).toBe(toIsoDate(new Date()))
  })

  it("sammenligner datoer riktig", () => {
    expect(isBeforeDay("2026-09-02", "2026-09-03")).toBe(true)
    expect(isBeforeDay("2026-09-03", "2026-09-03")).toBe(false)
    expect(isBeforeDay("2026-09-04", "2026-09-03")).toBe(false)
  })
})

describe("datovalidering", () => {
  const FROZEN_TODAY = "2026-09-03"
  const frozenSchema = createBookingSchema(() => FROZEN_TODAY)

  it("avviser en dato i fortiden med tydelig norsk melding", () => {
    expect(issuesFor({ ...VALID, date: "2026-09-02" }, "date", frozenSchema)).toEqual([
      PAST_DATE_MESSAGE,
    ])
    expect(PAST_DATE_MESSAGE).toBe("Du kan ikke velge en dato tilbake i tid.")
  })

  it("avviser datoer langt tilbake i tid", () => {
    expect(issuesFor({ ...VALID, date: "2020-01-01" }, "date", frozenSchema)).toEqual([
      PAST_DATE_MESSAGE,
    ])
  })

  it("godtar dagens dato", () => {
    expect(issuesFor({ ...VALID, date: FROZEN_TODAY }, "date", frozenSchema)).toHaveLength(0)
  })

  it("godtar en fremtidig dato", () => {
    expect(issuesFor({ ...VALID, date: "2026-09-04" }, "date", frozenSchema)).toHaveLength(0)
    expect(issuesFor({ ...VALID, date: "2027-12-24" }, "date", frozenSchema)).toHaveLength(0)
  })

  it("bruker den faktiske dagens dato i standardschemaet", () => {
    const today = new Date()
    expect(issuesFor({ ...VALID, date: toIsoDate(subDays(today, 1)) }, "date")).toEqual([
      PAST_DATE_MESSAGE,
    ])
    expect(issuesFor({ ...VALID, date: toIsoDate(today) }, "date")).toHaveLength(0)
    expect(issuesFor({ ...VALID, date: toIsoDate(addDays(today, 1)) }, "date")).toHaveLength(0)
  })

  it("gir bare «ikke gyldig»-melding for ugyldige datoer, ikke fortidsmelding i tillegg", () => {
    expect(issuesFor({ ...VALID, date: "2026-02-30" }, "date", frozenSchema)).toEqual([
      "Datoen er ikke gyldig.",
    ])
    expect(issuesFor({ ...VALID, date: "" }, "date", frozenSchema)).toEqual(["Velg en dato."])
  })

  it("henter «i dag» på nytt ved hver validering", () => {
    let today = "2026-09-03"
    const schema = createBookingSchema(() => today)
    expect(issuesFor({ ...VALID, date: "2026-09-03" }, "date", schema)).toHaveLength(0)
    today = "2026-09-10"
    expect(issuesFor({ ...VALID, date: "2026-09-03" }, "date", schema)).toEqual([PAST_DATE_MESSAGE])
  })
})

describe("skjemavalidering", () => {
  it("godtar et komplett skjema", () => {
    expect(bookingSchema.safeParse(VALID).success).toBe(true)
  })

  it("viser alle feil samtidig, også kryssfelt-feil, når flere felt mangler", () => {
    const paths = issuesForAll({
      ...VALID,
      buildingId: "",
      purposeId: "",
      date: "2020-01-01",
      startTime: "20:00",
      endTime: "18:00",
      confirmRequestOnly: false,
    })
    expect(paths).toContain("buildingId")
    expect(paths).toContain("purposeId")
    expect(paths).toContain("date")
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
