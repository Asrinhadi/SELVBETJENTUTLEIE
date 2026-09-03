import { addDays } from "date-fns"

import type { Applicant } from "@/domain/case"
import { getEventType, type EventNeeds, type FollowUpId } from "@/domain/event"
import type { VenueId } from "@/domain/venue"
import { toIsoDate, todayIsoDate } from "@/lib/dates"
import { isValidTimeRange } from "@/lib/time"

export interface StepDefinition {
  id: number
  title: string
  short: string
}

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
    applicant: {
      name: "Kari Nordmann",
      organization: "Borg vokalensemble",
      email: "kari.nordmann@example.com",
      phone: "912 34 567",
    },
  }
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
export const MAX_ATTENDEES = 2000

export function validateStep1(needs: EventNeeds): FieldErrors {
  const errors: FieldErrors = {}
  const today = todayIsoDate()

  if (needs.description.trim().length < DESCRIPTION_MIN) {
    errors.description = `Beskriv arrangementet med minst ${DESCRIPTION_MIN} tegn.`
  } else if (needs.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Beskrivelsen kan være maks ${DESCRIPTION_MAX} tegn.`
  }

  if (!Number.isFinite(needs.expectedAttendees) || needs.expectedAttendees < 1) {
    errors.expectedAttendees = "Oppgi forventet antall personer."
  } else if (needs.expectedAttendees > MAX_ATTENDEES) {
    errors.expectedAttendees = `Oppgi et tall under ${MAX_ATTENDEES}. Ta kontakt direkte for større arrangementer.`
  }

  if (!needs.date) {
    errors.date = "Velg ønsket dato."
  } else if (needs.date < today) {
    errors.date = "Du kan ikke velge en dato tilbake i tid."
  }

  if (!needs.startTime) errors.startTime = "Velg starttid."
  if (!needs.endTime) errors.endTime = "Velg sluttid."
  if (
    needs.startTime &&
    needs.endTime &&
    !isValidTimeRange(needs.startTime, needs.endTime)
  ) {
    errors.endTime = "Sluttid må være etter starttid."
  }

  if (needs.eventType === "annet" && needs.otherNeeds.trim().length === 0) {
    errors.otherNeeds = "Beskriv hva arrangementet går ut på."
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
  if (phone.length < 8) errors.phone = "Telefonnummeret må ha minst åtte tegn."
  else if (phone.length > 20) errors.phone = "Telefonnummeret kan være maks 20 tegn."
  else if (!/^[+\d\s()-]+$/.test(phone)) {
    errors.phone = "Telefonnummeret kan bare inneholde tall, mellomrom, + og bindestrek."
  }

  if ((applicant.organization ?? "").trim().length > 120) {
    errors.organization = "Maks 120 tegn."
  }

  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((v) => v !== undefined)
}
