import { z } from "zod"

import { BUILDING_IDS, PURPOSE_IDS } from "@/domain/rental"
import type { RentalState } from "@/context/rentalReducer"

export const STORAGE_KEY = "kirkeutleie-demo-state"
const STORAGE_VERSION = 1

/**
 * Lagret tilstand er data brukeren selv kan redigere i nettleseren, og
 * behandles derfor som utrygg inndata: alt valideres på nytt ved innlasting,
 * med øvre grenser på lengder og antall. Feiler noe, forkastes hele
 * tilstanden og demo-dataene brukes i stedet.
 */
const MAX_REQUESTS = 200
const MAX_TASKS_PER_REQUEST = 20
const MAX_HISTORY_PER_REQUEST = 200
const MAX_MESSAGE_LENGTH = 2000
const MAX_SHORT_TEXT = 200

const shortText = z.string().max(MAX_SHORT_TEXT)
/** yyyy-MM-dd */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
/** HH:mm */
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const taskSchema = z.object({
  id: shortText,
  type: z.enum(["contract", "invoice", "keys"]),
  title: shortText,
  responsibleRole: shortText,
  dueDate: isoDate,
  completed: z.boolean(),
})

const historyEventSchema = z.object({
  id: shortText,
  type: z.enum([
    "submitted",
    "info_requested",
    "approved",
    "rejected",
    "confirmation_created",
    "tasks_created",
    "task_completed",
    "task_reopened",
  ]),
  timestamp: z.string().max(40),
  actor: shortText,
  message: z.string().max(MAX_MESSAGE_LENGTH),
})

const requestSchema = z.object({
  id: shortText,
  reference: shortText,
  status: z.enum(["new", "needs_info", "approved", "rejected"]),
  buildingId: z.enum(BUILDING_IDS),
  date: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  purposeId: z.enum(PURPOSE_IDS),
  estimatedTicketRevenue: z.number().finite().nonnegative().optional(),
  description: z.string().max(MAX_MESSAGE_LENGTH),
  applicant: z.object({
    name: shortText,
    organization: shortText.optional(),
    email: shortText,
    phone: shortText,
  }),
  createdAt: z.string().max(40),
  confirmationCreated: z.boolean(),
  tasks: z.array(taskSchema).max(MAX_TASKS_PER_REQUEST),
  history: z.array(historyEventSchema).max(MAX_HISTORY_PER_REQUEST),
})

const persistedSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  state: z.object({
    requests: z.array(requestSchema).max(MAX_REQUESTS),
    nextSequence: z.number().int().positive().max(9999),
  }),
})

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null
    return window.sessionStorage
  } catch {
    return null
  }
}

export function loadPersistedState(): RentalState | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    // Zod fjerner ukjente nøkler (inkludert «__proto__»), så tuklet
    // lagringsdata kan ikke smugle inn ekstra felter.
    const parsed = persistedSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return parsed.data.state
  } catch {
    return null
  }
}

export function persistState(state: RentalState): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state }),
    )
  } catch {
    // Lagring er en bekvemmelighet i demoen – feil skal ikke stoppe appen.
  }
}

export function clearPersistedState(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Ignorer – se persistState.
  }
}
