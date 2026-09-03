import { z } from "zod"

import { BUILDING_IDS, PURPOSE_IDS } from "@/domain/rental"
import type { RentalState } from "@/context/rentalReducer"

export const STORAGE_KEY = "kirkeutleie-demo-state"
const STORAGE_VERSION = 1

const taskSchema = z.object({
  id: z.string(),
  type: z.enum(["contract", "invoice", "keys"]),
  title: z.string(),
  responsibleRole: z.string(),
  dueDate: z.string(),
  completed: z.boolean(),
})

const historyEventSchema = z.object({
  id: z.string(),
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
  timestamp: z.string(),
  actor: z.string(),
  message: z.string(),
})

const requestSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(["new", "needs_info", "approved", "rejected"]),
  buildingId: z.enum(BUILDING_IDS),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  purposeId: z.enum(PURPOSE_IDS),
  estimatedTicketRevenue: z.number().optional(),
  description: z.string(),
  applicant: z.object({
    name: z.string(),
    organization: z.string().optional(),
    email: z.string(),
    phone: z.string(),
  }),
  createdAt: z.string(),
  confirmationCreated: z.boolean(),
  tasks: z.array(taskSchema),
  history: z.array(historyEventSchema),
})

const persistedSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  state: z.object({
    requests: z.array(requestSchema),
    nextSequence: z.number().int().positive(),
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
