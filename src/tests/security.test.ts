import { addDays } from "date-fns"
import { describe, expect, it } from "vitest"

import {
  EMAIL_MAX,
  MAX_TICKET_REVENUE,
  NAME_MAX,
  PHONE_MAX,
  bookingSchema,
  createBookingSchema,
  parseRevenue,
  type BookingFormValues,
} from "@/lib/bookingSchema"
import { mailtoHref, telHref } from "@/lib/contactLinks"
import { STORAGE_KEY, loadPersistedState, persistState } from "@/context/persistence"
import { createInitialState } from "@/context/rentalReducer"
import { toIsoDate } from "@/lib/dates"
import { formatCurrency } from "@/lib/formatters"

const VALID: BookingFormValues = {
  buildingId: "sarpsborg",
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

function messagesFor(values: BookingFormValues, path: string): string[] {
  const result = bookingSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path.join(".") === path)
    .map((issue) => issue.message)
}

describe("beløpsparsing avviser tallformater som ikke er kroner", () => {
  it("avviser heksadesimal, eksponent, fortegn og Infinity", () => {
    expect(parseRevenue("0x2710")).toBeNull()
    expect(parseRevenue("1e15")).toBeNull()
    expect(parseRevenue("-500")).toBeNull()
    expect(parseRevenue("Infinity")).toBeNull()
    expect(parseRevenue("NaN")).toBeNull()
    expect(parseRevenue("1e308")).toBeNull()
  })

  it("avviser svært lange strenger", () => {
    expect(parseRevenue("1".repeat(22))).toBeNull()
  })

  it("godtar vanlige norske skrivemåter", () => {
    expect(parseRevenue("40 000")).toBe(40000)
    expect(parseRevenue("40.000")).toBe(40000)
    expect(parseRevenue("40000")).toBe(40000)
    expect(parseRevenue("1500,50")).toBe(1501)
  })

  it("avviser urimelig høye beløp i skjemaet", () => {
    const overLimit = String(MAX_TICKET_REVENUE + 1)
    expect(
      messagesFor(
        { ...VALID, purposeId: "concert_ticketed", estimatedTicketRevenue: overLimit },
        "estimatedTicketRevenue",
      ).length,
    ).toBeGreaterThan(0)
    expect(
      messagesFor(
        {
          ...VALID,
          purposeId: "concert_ticketed",
          estimatedTicketRevenue: String(MAX_TICKET_REVENUE),
        },
        "estimatedTicketRevenue",
      ),
    ).toHaveLength(0)
  })
})

describe("lengdegrenser på kontaktfelt", () => {
  it("avviser navn, e-post og telefon over grensen", () => {
    expect(messagesFor({ ...VALID, name: "a".repeat(NAME_MAX + 1) }, "name").length).toBeGreaterThan(0)
    expect(
      messagesFor({ ...VALID, email: `${"a".repeat(EMAIL_MAX)}@example.com` }, "email").length,
    ).toBeGreaterThan(0)
    expect(
      messagesFor({ ...VALID, phone: "1".repeat(PHONE_MAX + 1) }, "phone").length,
    ).toBeGreaterThan(0)
  })

  it("godtar verdier akkurat på grensen", () => {
    expect(messagesFor({ ...VALID, name: "a".repeat(NAME_MAX) }, "name")).toHaveLength(0)
    expect(messagesFor({ ...VALID, phone: "1".repeat(PHONE_MAX) }, "phone")).toHaveLength(0)
  })
})

describe("datoer langt fram i tid", () => {
  const schema = createBookingSchema(() => "2026-09-03")

  function dateMessages(date: string): string[] {
    const result = schema.safeParse({ ...VALID, date })
    if (result.success) return []
    return result.error.issues
      .filter((issue) => issue.path.join(".") === "date")
      .map((issue) => issue.message)
  }

  it("avviser år 9999", () => {
    expect(dateMessages("9999-12-31")).toContain(
      "Datoen kan ikke være mer enn fem år fram i tid.",
    )
  })

  it("godtar fem år fram i tid", () => {
    expect(dateMessages("2031-12-31")).toHaveLength(0)
    expect(dateMessages("2032-01-01").length).toBeGreaterThan(0)
  })
})

describe("kontaktlenker kan ikke smugle inn mailto-parametere", () => {
  it("avviser e-post med ekstra mailto-felter", () => {
    expect(mailtoHref("ok@example.no?bcc=angriper@example.org&subject=Hei")).toBeNull()
    expect(mailtoHref("ok@example.no&cc=angriper@example.org")).toBeNull()
    expect(mailtoHref("ikke-en-epost")).toBeNull()
    expect(mailtoHref("a".repeat(300) + "@example.no")).toBeNull()
  })

  it("lager lenke for gyldig e-post", () => {
    expect(mailtoHref("kari.nordmann@example.com")).toBe("mailto:kari.nordmann%40example.com")
  })

  it("avviser telefonnummer med ugyldige tegn", () => {
    expect(telHref("912 34 567; rm -rf")).toBeNull()
    expect(telHref("123")).toBeNull()
    expect(telHref("1".repeat(30))).toBeNull()
  })

  it("lager lenke for gyldig telefonnummer", () => {
    expect(telHref("912 34 567")).toBe("tel:91234567")
    expect(telHref("+47 912 34 567")).toBe("tel:+4791234567")
  })
})

describe("lagret tilstand behandles som utrygg inndata", () => {
  it("forkaster tilstand med ukjent bygg", () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          requests: [{ ...createInitialState().requests[0], buildingId: "rådhuset" }],
          nextSequence: 42,
        },
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("forkaster tilstand med ekstremt lange tekstfelter", () => {
    const base = createInitialState()
    const first = base.requests[0]
    if (!first) throw new Error("Forventet minst én demo-sak")
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          requests: [{ ...first, description: "x".repeat(5000) }],
          nextSequence: 42,
        },
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("forkaster ugyldig dato- og tidsformat", () => {
    const base = createInitialState()
    const first = base.requests[0]
    if (!first) throw new Error("Forventet minst én demo-sak")
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { requests: [{ ...first, startTime: "99:99" }], nextSequence: 42 },
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("fjerner ukjente nøkler og forurenser ikke Object.prototype", () => {
    const base = createInitialState()
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { ...base, ondsinnet: "ja", __proto__: { forurenset: "ja" } },
      }),
    )
    const loaded = loadPersistedState()
    expect(loaded).not.toBeNull()
    expect(Object.hasOwn(loaded ?? {}, "ondsinnet")).toBe(false)
    expect(({} as Record<string, unknown>).forurenset).toBeUndefined()
  })

  it("godtar og gjenoppretter en gyldig tilstand", () => {
    const state = createInitialState()
    persistState(state)
    expect(loadPersistedState()?.requests).toHaveLength(state.requests.length)
  })
})

describe("beløpsformatering tåler ekstremverdier", () => {
  it("formaterer store tall uten å henge", () => {
    const started = Date.now()
    expect(formatCurrency(MAX_TICKET_REVENUE)).toContain("100")
    expect(formatCurrency(0)).toContain("0")
    expect(Date.now() - started).toBeLessThan(1000)
  })
})
