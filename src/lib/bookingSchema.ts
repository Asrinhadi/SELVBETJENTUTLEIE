import { z } from "zod"

import {
  BUILDING_IDS,
  PURPOSE_IDS,
  type BuildingId,
  type PurposeId,
  type RentalRequestInput,
} from "@/domain/rental"
import { getWeekday, isValidTimeRange } from "@/lib/availability"

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export const DESCRIPTION_MIN = 10
export const DESCRIPTION_MAX = 600

export function isBuildingId(value: string): value is BuildingId {
  return (BUILDING_IDS as readonly string[]).includes(value)
}

export function isPurposeId(value: string): value is PurposeId {
  return (PURPOSE_IDS as readonly string[]).includes(value)
}

/**
 * Alle feltene er strenger/boolske verdier slik at ingen felt kan gi en
 * «abort»-feil i Zod. Dermed kjøres alltid kryssfelt-valideringen i
 * superRefine, og brukeren ser alle feil samtidig.
 */
export const bookingSchema = z
  .object({
    buildingId: z.string().min(1, "Velg hvilket bygg du ønsker å leie."),
    date: z
      .string()
      .min(1, "Velg en dato.")
      .refine((value) => getWeekday(value) !== null, "Datoen er ikke gyldig."),
    startTime: z
      .string()
      .min(1, "Velg starttid.")
      .regex(TIME_PATTERN, "Starttid må være på formatet TT:MM."),
    endTime: z
      .string()
      .min(1, "Velg sluttid.")
      .regex(TIME_PATTERN, "Sluttid må være på formatet TT:MM."),
    purposeId: z.string().min(1, "Velg formålet med leien."),
    estimatedTicketRevenue: z.string().trim(),
    name: z.string().trim().min(2, "Skriv inn navnet ditt."),
    organization: z.string().trim().max(120, "Maks 120 tegn."),
    email: z.email({ error: "Skriv inn en gyldig e-postadresse." }),
    phone: z
      .string()
      .trim()
      .min(8, "Telefonnummeret må ha minst åtte tegn.")
      .regex(
        /^[+\d\s()-]+$/,
        "Telefonnummeret kan bare inneholde tall, mellomrom, + og bindestrek.",
      ),
    description: z
      .string()
      .trim()
      .min(DESCRIPTION_MIN, `Beskrivelsen må være minst ${DESCRIPTION_MIN} tegn.`)
      .max(DESCRIPTION_MAX, `Beskrivelsen kan være maks ${DESCRIPTION_MAX} tegn.`),
    confirmRequestOnly: z
      .boolean()
      .refine((value) => value, "Du må bekrefte at dette bare er en forespørsel."),
  })
  .superRefine((values, ctx) => {
    if (values.buildingId.length > 0 && !isBuildingId(values.buildingId)) {
      ctx.addIssue({ code: "custom", path: ["buildingId"], message: "Ukjent bygg." })
    }

    if (values.purposeId.length > 0 && !isPurposeId(values.purposeId)) {
      ctx.addIssue({ code: "custom", path: ["purposeId"], message: "Ukjent formål." })
    }

    if (
      TIME_PATTERN.test(values.startTime) &&
      TIME_PATTERN.test(values.endTime) &&
      !isValidTimeRange(values.startTime, values.endTime)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Sluttid må være etter starttid.",
      })
    }

    if (values.purposeId === "concert_ticketed") {
      const revenue = parseRevenue(values.estimatedTicketRevenue)
      if (revenue === null || revenue <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["estimatedTicketRevenue"],
          message: "Oppgi estimert billettinntekt i hele kroner (større enn 0).",
        })
      }
    }
  })

export type BookingFormValues = z.infer<typeof bookingSchema>

/** Tolker et fritekstbeløp («40 000», «40000», «40.000») til hele kroner. */
export function parseRevenue(value: string): number | null {
  const cleaned = value.replace(/[\s.]/g, "").replace(",", ".")
  if (cleaned.length === 0) return null
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed)
}

/**
 * Konverterer validerte skjemaverdier til typesikker domeneinput.
 * Skjemaet garanterer gyldige id-er; guardene her gjør typen eksplisitt
 * uten type assertions.
 */
export function toRentalRequestInput(values: BookingFormValues): RentalRequestInput {
  const { buildingId, purposeId } = values
  if (!isBuildingId(buildingId)) {
    throw new Error(`Ukjent bygg: ${buildingId}`)
  }
  if (!isPurposeId(purposeId)) {
    throw new Error(`Ukjent formål: ${purposeId}`)
  }

  const revenue =
    purposeId === "concert_ticketed" ? parseRevenue(values.estimatedTicketRevenue) : null

  const organization = values.organization.trim()

  return {
    buildingId,
    purposeId,
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    description: values.description.trim(),
    applicant: {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      ...(organization.length > 0 ? { organization } : {}),
    },
    ...(revenue !== null && revenue > 0 ? { estimatedTicketRevenue: revenue } : {}),
  }
}
