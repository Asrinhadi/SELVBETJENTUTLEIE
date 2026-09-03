/**
 * Domenemodell for «Kirkeutleie – digital forespørsel og intern saksflyt».
 * Alt her er rene typer og konstanter uten React-avhengigheter.
 */

export const BUILDING_IDS = [
  "sarpsborg",
  "tune",
  "skjeberg",
  "greaker",
  "hafslundsoy",
  "kurland",
] as const

export type BuildingId = (typeof BUILDING_IDS)[number]

export type PriceGroup = "I" | "II"

export interface Building {
  id: BuildingId
  name: string
  priceGroup: PriceGroup
}

export const BUILDINGS: readonly Building[] = [
  { id: "sarpsborg", name: "Sarpsborg kirke", priceGroup: "I" },
  { id: "tune", name: "Tune kirke", priceGroup: "I" },
  { id: "skjeberg", name: "Skjeberg kirke", priceGroup: "I" },
  { id: "greaker", name: "Greåker menighetshus", priceGroup: "II" },
  { id: "hafslundsoy", name: "Hafslundsøy kirke", priceGroup: "II" },
  { id: "kurland", name: "Kurland menighetssenter", priceGroup: "II" },
]

export function getBuilding(id: BuildingId): Building {
  const building = BUILDINGS.find((b) => b.id === id)
  if (!building) {
    throw new Error(`Ukjent bygg: ${id}`)
  }
  return building
}

export const PURPOSE_IDS = [
  "concert_free",
  "concert_ticketed",
  "rehearsal",
  "wedding",
  "funeral_local",
  "funeral_external",
  "party_seminar",
  "other",
] as const

export type PurposeId = (typeof PURPOSE_IDS)[number]

export interface Purpose {
  id: PurposeId
  label: string
}

export const PURPOSES: readonly Purpose[] = [
  { id: "concert_free", label: "Konsert uten billettinntekter" },
  { id: "concert_ticketed", label: "Konsert med billettinntekter" },
  { id: "rehearsal", label: "Øvelse" },
  { id: "wedding", label: "Vielse" },
  { id: "funeral_local", label: "Gravferd – innenbys" },
  { id: "funeral_external", label: "Gravferd – utenbys" },
  { id: "party_seminar", label: "Selskap eller seminar" },
  { id: "other", label: "Annet arrangement" },
]

export function getPurpose(id: PurposeId): Purpose {
  const purpose = PURPOSES.find((p) => p.id === id)
  if (!purpose) {
    throw new Error(`Ukjent formål: ${id}`)
  }
  return purpose
}

export type RequestStatus = "new" | "needs_info" | "approved" | "rejected"

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Ny",
  needs_info: "Venter på svar",
  approved: "Godkjent",
  rejected: "Avslått",
}

export type AvailabilityStatus = "likely" | "conflict" | "review"

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  likely: "Ser ledig ut",
  conflict: "Mulig konflikt",
  review: "Må avklares",
}

export interface AvailabilityAssessment {
  status: AvailabilityStatus
  label: string
  reason: string
}

/**
 * Prisestimatet er en diskriminert union slik at UI-et alltid kan vise
 * riktig formulering («Fra …», «Pris avklares») uten spesialtilfeller.
 */
export type PriceEstimate =
  | { kind: "fixed"; amount: number }
  | { kind: "from"; amount: number }
  | {
      kind: "percentage"
      amount: number
      rate: number
      revenue: number
      minimum: number
      maximum?: number
      clampedTo?: "minimum" | "maximum"
    }
  | { kind: "to_be_clarified" }

export type TaskType = "contract" | "invoice" | "keys"

export interface CaseTask {
  id: string
  type: TaskType
  title: string
  responsibleRole: string
  /** ISO-dato (yyyy-MM-dd) */
  dueDate: string
  completed: boolean
}

export type HistoryEventType =
  | "submitted"
  | "info_requested"
  | "approved"
  | "rejected"
  | "confirmation_created"
  | "tasks_created"
  | "task_completed"
  | "task_reopened"

export interface HistoryEvent {
  id: string
  type: HistoryEventType
  /** ISO-tidsstempel */
  timestamp: string
  actor: string
  message: string
}

export interface Applicant {
  name: string
  organization?: string
  email: string
  phone: string
}

export interface RentalRequest {
  id: string
  reference: string
  status: RequestStatus
  buildingId: BuildingId
  /** ISO-dato (yyyy-MM-dd) */
  date: string
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
  purposeId: PurposeId
  estimatedTicketRevenue?: number
  description: string
  applicant: Applicant
  /** ISO-tidsstempel */
  createdAt: string
  confirmationCreated: boolean
  tasks: CaseTask[]
  history: HistoryEvent[]
}

/** Det som kommer inn fra det offentlige skjemaet, før saken er opprettet. */
export interface RentalRequestInput {
  buildingId: BuildingId
  date: string
  startTime: string
  endTime: string
  purposeId: PurposeId
  estimatedTicketRevenue?: number
  description: string
  applicant: Applicant
}
