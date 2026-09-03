import { z } from "zod"

import { CASE_STATUSES, type BookingRequest } from "@/domain/case"
import { EVENT_TYPE_IDS } from "@/domain/event"
import { FACILITY_IDS, VENUE_IDS } from "@/domain/venue"
import { assessAvailability } from "@/domain/availabilityEngine"
import { assessComplexity, findMissingInfo } from "@/domain/complexity"
import { calculatePrice } from "@/domain/pricingEngine"
import { evaluateVenue } from "@/domain/suitabilityEngine"
import { getVenue } from "@/domain/venue"
import { buildDemoCalendar } from "@/data/calendar"
import type { KirkeFlowState } from "@/context/kirkeflowReducer"

export const STORAGE_KEY = "kirkeflow-demo-v1"
const STORAGE_VERSION = 1

/**
 * Bare INNDATA lagres. Egnethet, tilgjengelighet, pris og kompleksitet
 * regnes ut på nytt ved innlasting, slik at lagret data aldri kommer ut av
 * synk med motorene. Lagret innhold er brukerredigerbart og behandles som
 * utrygg inndata: alt valideres, med lengde- og antallsgrenser.
 */
const MAX_CASES = 100
const MAX_TEXT = 2000
const shortText = z.string().max(200)

const needsSchema = z.object({
  eventType: z.enum(EVENT_TYPE_IDS),
  description: z.string().max(MAX_TEXT),
  expectedAttendees: z.number().int().min(0).max(10000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  setupMinutes: z.number().int().min(0).max(600),
  cleanupMinutes: z.number().int().min(0).max(600),
  requiredFacilities: z.array(z.enum(FACILITY_IDS)).max(FACILITY_IDS.length),
  otherNeeds: z.string().max(MAX_TEXT),
  amplifiedMusic: z.boolean().optional(),
  ticketed: z.boolean().optional(),
  servingFood: z.boolean().optional(),
  servingAlcohol: z.boolean().optional(),
  needsStage: z.boolean().optional(),
  publicEvent: z.boolean().optional(),
})

const eventSchema = z.object({
  id: shortText,
  type: z.enum([
    "opprettet",
    "automatisk_kontroll",
    "tildelt",
    "godkjent",
    "avslatt",
    "info_etterspurt",
    "info_mottatt",
    "pris_justert",
    "alternativ_foreslatt",
    "status_endret",
    "melding",
  ]),
  timestamp: z.string().max(40),
  actor: shortText,
  message: z.string().max(MAX_TEXT),
  fromStatus: z.enum(CASE_STATUSES).optional(),
  toStatus: z.enum(CASE_STATUSES).optional(),
})

const messageSchema = z.object({
  id: shortText,
  from: z.enum(["soker", "saksbehandler"]),
  author: shortText,
  timestamp: z.string().max(40),
  body: z.string().max(MAX_TEXT),
})

const caseSchema = z.object({
  id: shortText,
  caseNumber: shortText,
  status: z.enum(CASE_STATUSES),
  needs: needsSchema,
  venueId: z.enum(VENUE_IDS),
  recommendedVenueIds: z.array(z.enum(VENUE_IDS)).max(VENUE_IDS.length),
  applicant: z.object({
    name: shortText,
    organization: shortText.optional(),
    email: shortText,
    phone: shortText,
  }),
  assignedTo: shortText.nullable(),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  events: z.array(eventSchema).max(200),
  messages: z.array(messageSchema).max(200),
  priceAdjustment: z
    .object({ amount: z.number().finite(), reason: z.string().max(MAX_TEXT) })
    .optional(),
})

const persistedSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  cases: z.array(caseSchema).max(MAX_CASES),
  nextSequence: z.number().int().positive().max(99999),
})

type PersistedCase = z.infer<typeof caseSchema>

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Plukker ut justeringen fra prisoverslaget, slik at den overlever lagring. */
function extractAdjustment(request: BookingRequest) {
  const line = request.price.lines.find((l) => l.id === "justering")
  if (!line) return undefined
  return { amount: line.amount, reason: line.detail }
}

function toPersisted(request: BookingRequest): PersistedCase {
  const adjustment = extractAdjustment(request)
  return {
    id: request.id,
    caseNumber: request.caseNumber,
    status: request.status,
    needs: { ...request.needs, requiredFacilities: [...request.needs.requiredFacilities] },
    venueId: request.venueId,
    recommendedVenueIds: [...request.recommendedVenueIds],
    applicant: request.applicant,
    assignedTo: request.assignedTo,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    events: request.events.map((e) => ({ ...e })),
    messages: request.messages.map((m) => ({ ...m })),
    ...(adjustment ? { priceAdjustment: adjustment } : {}),
  }
}

/** Bygger opp igjen en full sak ved å kjøre motorene på nytt. */
function rehydrate(
  stored: PersistedCase,
  calendar: ReturnType<typeof buildDemoCalendar>,
): BookingRequest {
  const needs = { ...stored.needs }
  const suitability = evaluateVenue(needs, getVenue(stored.venueId))
  const availability = assessAvailability(needs, stored.venueId, calendar)
  const price = calculatePrice(needs, stored.venueId, {
    ...(stored.priceAdjustment ? { adjustment: stored.priceAdjustment } : {}),
  })
  const missingInfo = findMissingInfo(needs)
  const complexity = assessComplexity({
    needs,
    venueId: stored.venueId,
    suitability,
    availability,
    missingInfo,
  })

  return {
    id: stored.id,
    caseNumber: stored.caseNumber,
    status: stored.status,
    needs,
    venueId: stored.venueId,
    recommendedVenueIds: stored.recommendedVenueIds,
    applicant: stored.applicant,
    suitability,
    availability,
    price,
    complexity,
    missingInfo,
    assignedTo: stored.assignedTo,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    events: stored.events,
    messages: stored.messages,
  }
}

export function loadPersistedState(today: Date = new Date()): KirkeFlowState | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = persistedSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null

    const calendar = buildDemoCalendar(today)
    return {
      calendar,
      cases: parsed.data.cases.map((c) => rehydrate(c, calendar)),
      nextSequence: parsed.data.nextSequence,
    }
  } catch {
    return null
  }
}

export function persistState(state: KirkeFlowState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        cases: state.cases.map(toPersisted),
        nextSequence: state.nextSequence,
      }),
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
