import type { FacilityId } from "@/domain/venue"

/** Arrangementstyper brukeren kan velge i steg 1. */
export const EVENT_TYPE_IDS = [
  "konsert",
  "mote",
  "kurs",
  "minnesamvaer",
  "selskap",
  "ovelse",
  "kulturarrangement",
  "annet",
] as const

export type EventTypeId = (typeof EVENT_TYPE_IDS)[number]

/** Oppfølgingsspørsmål som bare vises for relevante arrangementstyper. */
export type FollowUpId =
  | "amplifiedMusic"
  | "ticketed"
  | "servingFood"
  | "servingAlcohol"
  | "needsStage"
  | "publicEvent"

export interface EventTypeDefinition {
  id: EventTypeId
  label: string
  description: string
  /** Hvilke oppfølgingsspørsmål som er relevante. */
  followUps: readonly FollowUpId[]
  /** Typiske behov som forhåndsvelges for å gjøre demoen rask å teste. */
  suggestedFacilities: readonly FacilityId[]
}

export const EVENT_TYPES: readonly EventTypeDefinition[] = [
  {
    id: "konsert",
    label: "Konsert",
    description: "Musikkframføring med publikum.",
    followUps: ["amplifiedMusic", "ticketed", "needsStage", "publicEvent"],
    suggestedFacilities: ["piano", "lydanlegg"],
  },
  {
    id: "mote",
    label: "Møte",
    description: "Styremøte, årsmøte eller annet organisasjonsmøte.",
    followUps: [],
    suggestedFacilities: ["projektor"],
  },
  {
    id: "kurs",
    label: "Kurs",
    description: "Undervisning, seminar eller workshop.",
    followUps: ["servingFood"],
    suggestedFacilities: ["projektor", "kjokken"],
  },
  {
    id: "minnesamvaer",
    label: "Minnesamvær",
    description: "Samling etter gravferd.",
    followUps: ["servingFood"],
    suggestedFacilities: ["kjokken", "universell_adkomst"],
  },
  {
    id: "selskap",
    label: "Selskap",
    description: "Dåpsselskap, konfirmasjon, jubileum eller lignende.",
    followUps: ["servingFood", "servingAlcohol", "amplifiedMusic"],
    suggestedFacilities: ["kjokken", "lydanlegg"],
  },
  {
    id: "ovelse",
    label: "Øvelse",
    description: "Kor-, korps- eller ensembleøvelse uten publikum.",
    followUps: [],
    suggestedFacilities: ["piano"],
  },
  {
    id: "kulturarrangement",
    label: "Kulturarrangement",
    description: "Foredrag, utstilling, teater eller lignende.",
    followUps: ["amplifiedMusic", "ticketed", "needsStage", "publicEvent"],
    suggestedFacilities: ["lydanlegg", "projektor"],
  },
  {
    id: "annet",
    label: "Annet arrangement",
    description: "Beskriv behovet i fritekst, så vurderer vi det manuelt.",
    followUps: ["publicEvent"],
    suggestedFacilities: [],
  },
]

export function getEventType(id: EventTypeId): EventTypeDefinition {
  const type = EVENT_TYPES.find((t) => t.id === id)
  if (!type) throw new Error(`Ukjent arrangementstype: ${id}`)
  return type
}

export function isEventTypeId(value: string): value is EventTypeId {
  return (EVENT_TYPE_IDS as readonly string[]).includes(value)
}

/** Behovene brukeren beskriver i steg 1. Utgangspunktet for hele vurderingen. */
export interface EventNeeds {
  eventType: EventTypeId
  description: string
  expectedAttendees: number
  /** ISO-dato, yyyy-MM-dd */
  date: string
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
  setupMinutes: number
  cleanupMinutes: number
  requiredFacilities: readonly FacilityId[]
  otherNeeds: string
  /** Oppfølgingssvar. Udefinert når spørsmålet ikke er relevant for typen. */
  amplifiedMusic?: boolean
  ticketed?: boolean
  servingFood?: boolean
  servingAlcohol?: boolean
  needsStage?: boolean
  publicEvent?: boolean
}
