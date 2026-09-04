import { addDays, subDays } from "date-fns"
import { describe, expect, it } from "vitest"

import {
  DEMO_APPLICANT,
  DESCRIPTION_MAX,
  MAX_ATTENDEES,
  MAX_BUFFER_MINUTES,
  OTHER_NEEDS_MAX,
  buildInitialWizardData,
  validateStep1,
  validateStep5,
} from "@/components/wizard/wizardState"
import { STORAGE_KEY, loadPersistedState, persistState } from "@/context/persistence"
import { createInitialState } from "@/context/kirkeflowReducer"
import { mailtoHref, telHref } from "@/lib/contactLinks"
import { toIsoDate } from "@/lib/dates"

const BASE = buildInitialWizardData().needs
const VALID_NEEDS = { ...BASE, description: "En helt vanlig konsert med kor og orgel." }
const VALID_APPLICANT = DEMO_APPLICANT

describe("lagring inneholder ikke varige personopplysninger", () => {
  it("bruker sessionStorage, ikke localStorage", () => {
    const state = createInitialState()
    persistState(state)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("kan leses tilbake igjen", () => {
    const state = createInitialState()
    persistState(state)
    expect(loadPersistedState()?.cases).toHaveLength(state.cases.length)
  })
})

describe("validering av dato", () => {
  it("avviser dato tilbake i tid", () => {
    const errors = validateStep1({ ...VALID_NEEDS, date: toIsoDate(subDays(new Date(), 1)) })
    expect(errors.date).toBe("Du kan ikke velge en dato tilbake i tid.")
  })

  it("godtar dagens dato og nær framtid", () => {
    expect(validateStep1({ ...VALID_NEEDS, date: toIsoDate(new Date()) }).date).toBeUndefined()
    expect(
      validateStep1({ ...VALID_NEEDS, date: toIsoDate(addDays(new Date(), 30)) }).date,
    ).toBeUndefined()
  })

  it("avviser dato langt fram i tid", () => {
    expect(validateStep1({ ...VALID_NEEDS, date: "9999-12-31" }).date).toMatch(/år fram i tid/)
  })

  it("avviser ugyldig datoformat", () => {
    expect(validateStep1({ ...VALID_NEEDS, date: "ikke-en-dato" }).date).toBe(
      "Datoen er ikke gyldig.",
    )
  })
})

describe("validering av tid og antall", () => {
  it("krever at sluttid er etter starttid", () => {
    const errors = validateStep1({ ...VALID_NEEDS, startTime: "20:00", endTime: "18:00" })
    expect(errors.endTime).toBe("Sluttid må være etter starttid.")
  })

  it("avviser deltakerantall utenfor grensene", () => {
    expect(validateStep1({ ...VALID_NEEDS, expectedAttendees: 0 }).expectedAttendees).toBeDefined()
    expect(
      validateStep1({ ...VALID_NEEDS, expectedAttendees: MAX_ATTENDEES + 1 }).expectedAttendees,
    ).toBeDefined()
    expect(
      validateStep1({ ...VALID_NEEDS, expectedAttendees: MAX_ATTENDEES }).expectedAttendees,
    ).toBeUndefined()
  })

  it("avviser klargjørings- og ryddetid utenfor grensene", () => {
    expect(validateStep1({ ...VALID_NEEDS, setupMinutes: -30 }).setupMinutes).toBeDefined()
    expect(
      validateStep1({ ...VALID_NEEDS, cleanupMinutes: MAX_BUFFER_MINUTES + 1 }).cleanupMinutes,
    ).toBeDefined()
  })
})

describe("lengdegrenser på fritekst", () => {
  it("avviser for lang beskrivelse", () => {
    expect(
      validateStep1({ ...VALID_NEEDS, description: "x".repeat(DESCRIPTION_MAX + 1) }).description,
    ).toBeDefined()
  })

  it("avviser for kort beskrivelse", () => {
    expect(validateStep1({ ...VALID_NEEDS, description: "Kort" }).description).toBeDefined()
  })

  it("avviser for lange andre behov", () => {
    expect(
      validateStep1({ ...VALID_NEEDS, otherNeeds: "x".repeat(OTHER_NEEDS_MAX + 1) }).otherNeeds,
    ).toBeDefined()
  })
})

describe("validering av kontaktopplysninger", () => {
  it("starter med tomme felt – systemet fyller aldri inn stille", () => {
    const applicant = buildInitialWizardData().applicant
    expect(applicant.name).toBe("")
    expect(applicant.email).toBe("")
    expect(applicant.phone).toBe("")
    expect(Object.keys(validateStep5(applicant)).length).toBeGreaterThan(0)
  })

  it("godtar testopplysningene som fylles inn ved et bevisst klikk", () => {
    expect(Object.keys(validateStep5(VALID_APPLICANT))).toHaveLength(0)
  })

  it("avviser tom e-post og tomt telefonnummer", () => {
    const errors = validateStep5({ ...VALID_APPLICANT, email: "", phone: "" })
    expect(errors.email).toBe("Skriv inn e-postadressen din.")
    expect(errors.phone).toBeDefined()
  })

  it("avviser ugyldig e-post", () => {
    expect(validateStep5({ ...VALID_APPLICANT, email: "ikke-en-epost" }).email).toBeDefined()
    expect(
      validateStep5({ ...VALID_APPLICANT, email: `${"a".repeat(300)}@example.no` }).email,
    ).toBeDefined()
  })

  it("krever gyldig telefonnummer innenfor lengdegrensene", () => {
    expect(validateStep5({ ...VALID_APPLICANT, phone: "1234567" }).phone).toBeDefined()
    expect(validateStep5({ ...VALID_APPLICANT, phone: "1".repeat(21) }).phone).toBeDefined()
    expect(validateStep5({ ...VALID_APPLICANT, phone: "<script>" }).phone).toBeDefined()
  })

  it("setter tak på navn og organisasjon", () => {
    expect(validateStep5({ ...VALID_APPLICANT, name: "a".repeat(101) }).name).toBeDefined()
    expect(
      validateStep5({ ...VALID_APPLICANT, organization: "a".repeat(121) }).organization,
    ).toBeDefined()
  })
})

describe("lenker bygges ikke direkte fra brukerinput", () => {
  it("avviser e-post som prøver å smugle inn mailto-parametere", () => {
    expect(mailtoHref("ok@example.no?bcc=angriper@example.org&subject=Hei")).toBeNull()
    expect(mailtoHref("javascript:alert(1)")).toBeNull()
    expect(mailtoHref("<script>alert(1)</script>")).toBeNull()
  })

  it("avviser telefonnummer med ugyldige tegn", () => {
    expect(telHref("900 00 100; rm -rf")).toBeNull()
    expect(telHref("javascript:alert(1)")).toBeNull()
  })

  it("lager lenke bare for gyldige verdier", () => {
    expect(mailtoHref("kari.nordmann@example.com")).toBe("mailto:kari.nordmann%40example.com")
    expect(telHref("+47 900 00 100")).toBe("tel:+4790000100")
    expect(telHref("900 00 100")).toBe("tel:90000100")
  })
})

describe("lagret tilstand behandles som utrygg inndata", () => {
  it("forkaster ukjent lokale", () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: [{ ...toStored(), venueId: "radhuset" }],
        nextSequence: 148,
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("forkaster ugyldig klokkeslett", () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: [{ ...toStored(), needs: { ...toStored().needs, startTime: "99:99" } }],
        nextSequence: 148,
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("forkaster ekstremt lange tekstfelter", () => {
    const stored = toStored()
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: [{ ...stored, needs: { ...stored.needs, description: "x".repeat(5000) } }],
        nextSequence: 148,
      }),
    )
    expect(loadPersistedState()).toBeNull()
  })

  it("forurenser ikke Object.prototype", () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: [],
        nextSequence: 148,
        __proto__: { forurenset: "ja" },
      }),
    )
    loadPersistedState()
    expect(({} as Record<string, unknown>).forurenset).toBeUndefined()
  })

  it("forkaster ugyldig JSON uten å kaste", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{ikke gyldig json")
    expect(loadPersistedState()).toBeNull()
  })
})

/** Minimal, gyldig lagret sak som utgangspunkt for tuklingstestene. */
function toStored() {
  const state = createInitialState()
  persistState(state)
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  const parsed: unknown = JSON.parse(raw ?? "{}")
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("cases" in parsed) ||
    !Array.isArray(parsed.cases) ||
    parsed.cases.length === 0
  ) {
    throw new Error("Forventet minst én lagret sak")
  }
  return parsed.cases[0] as { venueId: string; needs: Record<string, unknown> }
}
