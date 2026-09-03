import type { RentalRequest } from "@/domain/rental"
import { DEMO_NEXT_SEQUENCE, DEMO_REQUESTS } from "@/data/demoData"
import {
  approveRequest,
  rejectRequest,
  requestMoreInfo,
  setTaskCompleted,
} from "@/lib/caseflow"

export interface RentalState {
  requests: RentalRequest[]
  nextSequence: number
}

export type RentalAction =
  | { type: "request/submitted"; request: RentalRequest }
  | { type: "request/approved"; requestId: string; at: string }
  | { type: "request/rejected"; requestId: string; reason: string; at: string }
  | { type: "request/infoRequested"; requestId: string; message: string; at: string }
  | { type: "task/toggled"; requestId: string; taskId: string; completed: boolean; at: string }
  | { type: "demo/reset" }

export function createInitialState(): RentalState {
  return {
    requests: DEMO_REQUESTS.map((request) => structuredClone(request)),
    nextSequence: DEMO_NEXT_SEQUENCE,
  }
}

function updateRequest(
  state: RentalState,
  requestId: string,
  update: (request: RentalRequest) => RentalRequest,
): RentalState {
  const index = state.requests.findIndex((r) => r.id === requestId)
  if (index === -1) return state

  const current = state.requests[index]
  if (!current) return state

  const next = update(current)
  if (next === current) return state

  const requests = state.requests.slice()
  requests[index] = next
  return { ...state, requests }
}

export function rentalReducer(
  state: RentalState,
  action: RentalAction,
): RentalState {
  switch (action.type) {
    case "request/submitted":
      return {
        ...state,
        requests: [action.request, ...state.requests],
        nextSequence: state.nextSequence + 1,
      }

    case "request/approved":
      return updateRequest(state, action.requestId, (request) =>
        approveRequest(request, new Date(action.at)),
      )

    case "request/rejected":
      return updateRequest(state, action.requestId, (request) =>
        rejectRequest(request, action.reason, new Date(action.at)),
      )

    case "request/infoRequested":
      return updateRequest(state, action.requestId, (request) =>
        requestMoreInfo(request, action.message, new Date(action.at)),
      )

    case "task/toggled":
      return updateRequest(state, action.requestId, (request) =>
        setTaskCompleted(request, action.taskId, action.completed, new Date(action.at)),
      )

    case "demo/reset":
      return createInitialState()
  }
}
