import { addDays } from "date-fns"
import { z } from "zod"

import type { Applicant } from "@/domain/case"
import {
  EVENT_TYPE_IDS,
  getEventType,
  type EventNeeds,
  type FollowUpId,
} from "@/domain/event"
import { FACILITY_IDS, VENUE_IDS, type VenueId } from "@/domain/venue"
import { toIsoDate } from "@/lib/dates"
import { MAX_EVENT_MINUTES, durationMinutes, toDateTime } from "@/lib/time"

export interface StepDefinition {
  id: number
  title: string
  short: string
}

/**
 * Korte navn i selve stepperen, slik at de aldri avkortes. Den fulle
 * tittelen leses opp av skjermlesere og vises som overskrift i steget.
 */
export const WIZARD_STEPS: readonly StepDefinition[] = [
  { id: 1, title: "Beskriv arrangementet", short: "Behov" },
  { id: 2, title: "Anbefalte lokaler", short: "Lokale" },
  { id: 3, title: "Dato og tidspunkt", short: "Tid" },
  { id: 4, title: "Prisoverslag", short: "Pris" },
  { id: 5, title: "Send inn", short: "Send inn" },
]

export interface WizardData {
  needs: EventNeeds
  venueId: VenueId | null
  applicant: Applicant
}

/** Forhåndsutfylte, tydelig fiktive verdier så demoen er rask å teste. */
export function buildInitialWizardData(today: Date = new Date()): WizardData {
  return {
    needs: {
      eventType: "konsert",
      description: "",
      expectedAttendees: 80,
      date: toIsoDate(addDays(today, 21)),
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
    },
    venueId: null,
    // Kontaktfeltene står tomme med vilje. Systemet skal aldri fylle inn
    // opplysninger om en person uten at brukeren ser at det skjer – knappen
    // «Fyll inn fiktive testopplysninger» gjør det synlig og bevisst.
    applicant: { name: "", organization: "", email: "", phone: "" },
  }
}

/** Åpenbart fiktive testopplysninger, satt inn ved et bevisst klikk. */
export const DEMO_APPLICANT: Applicant = {
  name: "Kari Nordmann",
  organization: "Borg vokalensemble",
  email: "kari.nordmann@example.com",
  phone: "900 00 100",
}

/**
 * Nullstiller oppfølgingssvar som ikke lenger er relevante når
 * arrangementstypen endres, slik at vi ikke vurderer skjulte svar.
 */
export function applyEventType(needs: EventNeeds, eventType: EventNeeds["eventType"]): EventNeeds {
  const definition = getEventType(eventType)
  const relevant = new Set<FollowUpId>(definition.followUps)
  const next: EventNeeds = { ...needs, eventType }

  const keys: FollowUpId[] = [
    "amplifiedMusic",
    "ticketed",
    "servingFood",
    "servingAlcohol",
    "needsStage",
    "publicEvent",
  ]
  for (const key of keys) {
    if (relevant.has(key)) {
      next[key] = needs[key] ?? false
    } else {
      delete next[key]
    }
  }
  return next
}

export type FieldErrors = Partial<Record<string, string>>

export const DESCRIPTION_MIN = 15
export const DESCRIPTION_MAX = 800
export const OTHER_NEEDS_MAX = 800
export const MAX_ATTENDEES = 2000
export const MAX_BUFFER_MINUTES = 600
/** Hvor langt fram i tid en forespørsel kan gjelde. */
const MAX_YEARS_AHEAD = 5
/** Korteste varsel en saksbehandler realistisk rekker å behandle. */
export const MIN_LEAD_MINUTES = 120

export function validateStep1(needs: EventNeeds, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {}
  const today = toIsoDate(now)

  if (needs.description.trim().length < DESCRIPTION_MIN) {
    errors.description = `Beskriv arrangementet med minst ${DESCRIPTION_MIN} tegn.`
  } else if (needs.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Beskrivelsen kan være maks ${DESCRIPTION_MAX} tegn.`
  }

  if (!Number.isFinite(needs.expectedAttendees) || needs.expectedAttendees < 1) {
    errors.expectedAttendees =
      needs.expectedAttendees < 0
        ? "Antall personer kan ikke være et negativt tall."
        : "Oppgi forventet antall personer."
  } else if (!Number.isInteger(needs.expectedAttendees)) {
    errors.expectedAttendees = "Oppgi antall personer som et helt tall."
  } else if (needs.expectedAttendees > MAX_ATTENDEES) {
    errors.expectedAttendees = `Oppgi et tall under ${MAX_ATTENDEES}. Ta kontakt direkte for større arrangementer.`
  }

  if (!needs.date) {
    errors.date = "Velg ønsket dato."
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(needs.date)) {
    errors.date = "Datoen er ikke gyldig."
  } else if (needs.date < today) {
    errors.date = "Du kan ikke velge en dato tilbake i tid."
  } else if (Number(needs.date.slice(0, 4)) > Number(today.slice(0, 4)) + MAX_YEARS_AHEAD) {
    errors.date = `Datoen kan ikke være mer enn ${MAX_YEARS_AHEAD} år fram i tid.`
  }

  if (!needs.startTime) errors.startTime = "Velg starttid."
  if (!needs.endTime) errors.endTime = "Velg sluttid."

  const minutes =
    needs.startTime && needs.endTime ? durationMinutes(needs.startTime, needs.endTime) : null

  if (needs.startTime && needs.endTime && minutes === null) {
    errors.endTime = "Sluttid kan ikke være lik starttid."
  } else if (minutes !== null && minutes > MAX_EVENT_MINUTES) {
    errors.endTime = `Arrangementet kan vare maks ${MAX_EVENT_MINUTES / 60} timer. Del det opp, eller ta kontakt direkte.`
  }

  // Datoen alene er ikke nok: et tidspunkt tidligere i dag er også fortid.
  if (!errors.date && !errors.startTime && needs.date === today) {
    const start = toDateTime(needs.date, needs.startTime)
    if (start && start.getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) {
      errors.startTime =
        MIN_LEAD_MINUTES > 0
          ? `Forespørselen må sendes minst ${MIN_LEAD_MINUTES / 60} timer før arrangementet starter.`
          : "Starttidspunktet er allerede passert."
    }
  }

  if (needs.eventType === "annet" && needs.otherNeeds.trim().length === 0) {
    errors.otherNeeds = "Beskriv hva arrangementet går ut på."
  } else if (needs.otherNeeds.trim().length > OTHER_NEEDS_MAX) {
    errors.otherNeeds = `Teksten kan være maks ${OTHER_NEEDS_MAX} tegn.`
  }

  // Verdiene kommer fra nedtrekk, men valideres likevel: DOM-en kan endres.
  for (const [field, value] of [
    ["setupMinutes", needs.setupMinutes],
    ["cleanupMinutes", needs.cleanupMinutes],
  ] as const) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_BUFFER_MINUTES) {
      errors[field] = `Velg et tidsrom mellom 0 og ${MAX_BUFFER_MINUTES} minutter.`
    }
  }

  return errors
}

export function validateStep5(applicant: Applicant): FieldErrors {
  const errors: FieldErrors = {}

  if (applicant.name.trim().length < 2) errors.name = "Skriv inn navnet ditt."
  else if (applicant.name.trim().length > 100) errors.name = "Navnet kan være maks 100 tegn."

  const email = applicant.email.trim()
  if (email.length === 0) errors.email = "Skriv inn e-postadressen din."
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Skriv inn en gyldig e-postadresse."
  }

  const phone = applicant.phone.trim()
  const digits = phone.replace(/\D/g, "")
  if (phone.length === 0) errors.phone = "Skriv inn telefonnummeret ditt."
  else if (phone.length > 20) errors.phone = "Telefonnummeret kan være maks 20 tegn."
  else if (!/^[+\d\s()-]+$/.test(phone)) {
    errors.phone = "Telefonnummeret kan bare inneholde tall, mellomrom, + og bindestrek."
  } else if (digits.length < 8) {
    // «++++++++» er åtte tegn, men null siffer.
    errors.phone = "Telefonnummeret må ha minst åtte siffer."
  }

  if ((applicant.organization ?? "").trim().length > 120) {
    errors.organization = "Maks 120 tegn."
  }

  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((v) => v !== undefined)
}

const DRAFT_KEY = "kirkeflow-utkast-v1"

/**
 * Utkastet lagres i sessionStorage, slik at en refresh midt i veiviseren
 * ikke sletter alt brukeren har skrevet. Samme lagring som sakene: forsvinner
 * når fanen lukkes, og sendes aldri ut av nettleseren.
 */
export function saveDraft(data: WizardData, step: number): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step }))
  } catch {
    // Lagring er en bekvemmelighet – feil skal ikke stoppe veiviseren.
  }
}

export function loadDraft(): { data: WizardData; step: number } | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    const fallback = buildInitialWizardData()
    return {
      step: parsed.data.step,
      data: {
        needs: { ...fallback.needs, ...parsed.data.data.needs },
        venueId: parsed.data.data.venueId ?? null,
        applicant: { ...fallback.applicant, ...parsed.data.data.applicant },
      },
    }
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignorer – se saveDraft.
  }
}

/** Utkastet er brukerredigerbart, så det valideres på nytt ved innlasting. */
const draftSchema = z.object({
  step: z.number().int().min(1).max(5),
  data: z.object({
    needs: z.object({
      eventType: z.enum(EVENT_TYPE_IDS),
      description: z.string().max(DESCRIPTION_MAX + 100),
      expectedAttendees: z.number().finite(),
      date: z.string().max(20),
      startTime: z.string().max(10),
      endTime: z.string().max(10),
      setupMinutes: z.number().int().min(0).max(MAX_BUFFER_MINUTES),
      cleanupMinutes: z.number().int().min(0).max(MAX_BUFFER_MINUTES),
      requiredFacilities: z.array(z.enum(FACILITY_IDS)).max(FACILITY_IDS.length),
      otherNeeds: z.string().max(OTHER_NEEDS_MAX + 100),
      amplifiedMusic: z.boolean().optional(),
      ticketed: z.boolean().optional(),
      servingFood: z.boolean().optional(),
      servingAlcohol: z.boolean().optional(),
      needsStage: z.boolean().optional(),
      publicEvent: z.boolean().optional(),
    }),
    venueId: z.enum(VENUE_IDS).nullable(),
    applicant: z.object({
      name: z.string().max(200),
      organization: z.string().max(200).optional(),
      email: z.string().max(300),
      phone: z.string().max(50),
    }),
  }),
})

/** Feltene i visuell rekkefølge, slik at vi alltid hopper til den øverste feilen. */
const FIELD_ORDER: readonly string[] = [
  "eventType",
  "description",
  "expectedAttendees",
  "date",
  "startTime",
  "endTime",
  "setupMinutes",
  "cleanupMinutes",
  "otherNeeds",
  "name",
  "organization",
  "email",
  "phone",
]

/**
 * Flytter fokus til det første feltet med feil og ruller det til syne.
 * Uten dette havner feilmeldingen ofte utenfor skjermen, siden knappen
 * ligger nederst og skjemaet er langt.
 *
 * `idMap` brukes der samme felt har en annen DOM-id i et annet steg.
 */
export function focusFirstError(
  errors: FieldErrors,
  idMap: Record<string, string> = {},
): void {
  const firstKey = FIELD_ORDER.find((key) => errors[key] !== undefined)
  if (!firstKey) return

  const element = document.getElementById(idMap[firstKey] ?? firstKey)
  if (!(element instanceof HTMLElement)) return

  element.scrollIntoView({ block: "center", behavior: "smooth" })
  element.focus({ preventScroll: true })
}
