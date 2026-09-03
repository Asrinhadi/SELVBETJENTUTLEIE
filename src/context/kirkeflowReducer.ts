import type { BookingRequest } from "@/domain/case"
import type { CalendarBooking } from "@/domain/availabilityEngine"
import {
  addApplicantMessage,
  adjustPrice,
  approveCase,
  assignCase,
  confirmPayment,
  createCase,
  proposeAlternative,
  rejectCase,
  requestMoreInfo,
  type CreateCaseInput,
} from "@/domain/caseflow"
import { buildDemoCalendar } from "@/data/calendar"
import { DEMO_START_SEQUENCE, buildDemoCases } from "@/data/demoCases"

export interface KirkeFlowState {
  cases: BookingRequest[]
  calendar: readonly CalendarBooking[]
  nextSequence: number
}

export type KirkeFlowAction =
  | { type: "case/created"; request: BookingRequest }
  | { type: "case/assigned"; caseId: string; staffId: string; staffName: string; at: string }
  | { type: "case/approved"; caseId: string; staffName: string; at: string }
  | { type: "case/paymentConfirmed"; caseId: string; staffName: string; at: string }
  | { type: "case/rejected"; caseId: string; reason: string; staffName: string; at: string }
  | { type: "case/infoRequested"; caseId: string; message: string; staffName: string; at: string }
  | {
      type: "case/priceAdjusted"
      caseId: string
      amount: number
      reason: string
      staffName: string
      at: string
    }
  | {
      type: "case/alternativeProposed"
      caseId: string
      proposal: string
      staffName: string
      at: string
    }
  | { type: "case/applicantReplied"; caseId: string; body: string; at: string }
  | { type: "demo/reset" }

export function createInitialState(today: Date = new Date()): KirkeFlowState {
  const calendar = buildDemoCalendar(today)
  const cases = buildDemoCases(today, calendar)
  return {
    calendar,
    cases,
    nextSequence: DEMO_START_SEQUENCE + cases.length,
  }
}

export function buildCase(
  state: KirkeFlowState,
  input: Omit<CreateCaseInput, "calendar">,
  now: Date,
): BookingRequest {
  return createCase({ ...input, calendar: state.calendar }, state.nextSequence, now)
}

function update(
  state: KirkeFlowState,
  caseId: string,
  fn: (request: BookingRequest) => BookingRequest,
): KirkeFlowState {
  const index = state.cases.findIndex((c) => c.id === caseId)
  if (index === -1) return state
  const current = state.cases[index]
  if (!current) return state
  const next = fn(current)
  if (next === current) return state
  const cases = state.cases.slice()
  cases[index] = next
  return { ...state, cases }
}

export function kirkeflowReducer(
  state: KirkeFlowState,
  action: KirkeFlowAction,
): KirkeFlowState {
  switch (action.type) {
    case "case/created":
      return {
        ...state,
        cases: [action.request, ...state.cases],
        nextSequence: state.nextSequence + 1,
      }

    case "case/assigned":
      return update(state, action.caseId, (c) =>
        assignCase(c, action.staffId, action.staffName, new Date(action.at)),
      )

    case "case/approved":
      return update(state, action.caseId, (c) =>
        approveCase(c, action.staffName, new Date(action.at)),
      )

    case "case/paymentConfirmed":
      return update(state, action.caseId, (c) =>
        confirmPayment(c, action.staffName, new Date(action.at)),
      )

    case "case/rejected":
      return update(state, action.caseId, (c) =>
        rejectCase(c, action.reason, action.staffName, new Date(action.at)),
      )

    case "case/infoRequested":
      return update(state, action.caseId, (c) =>
        requestMoreInfo(c, action.message, action.staffName, new Date(action.at)),
      )

    case "case/priceAdjusted":
      return update(state, action.caseId, (c) =>
        adjustPrice(c, action.amount, action.reason, action.staffName, new Date(action.at)),
      )

    case "case/alternativeProposed":
      return update(state, action.caseId, (c) =>
        proposeAlternative(c, action.proposal, action.staffName, new Date(action.at)),
      )

    case "case/applicantReplied":
      return update(state, action.caseId, (c) =>
        addApplicantMessage(c, action.body, new Date(action.at)),
      )

    case "demo/reset":
      return createInitialState()
  }
}
