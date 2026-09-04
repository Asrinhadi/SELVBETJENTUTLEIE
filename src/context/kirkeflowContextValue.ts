import { createContext } from "react"

import type { CalendarBooking } from "@/domain/availabilityEngine"
import type { BookingRequest } from "@/domain/case"
import type { CreateCaseInput } from "@/domain/caseflow"
import type { KirkeFlowState } from "@/context/kirkeflowReducer"

export interface InboxStats {
  total: number
  awaitingReview: number
  awaitingApplicant: number
  withConflict: number
  unassigned: number
}

export interface KirkeFlowContextValue {
  state: KirkeFlowState
  /** Sakene med tilgjengelighet og kompleksitet regnet ut mot hverandre. */
  cases: readonly BookingRequest[]
  /** Demokalenderen pluss sakene i systemet. */
  calendar: readonly CalendarBooking[]
  stats: InboxStats
  getCase: (caseId: string) => BookingRequest | undefined
  getCaseByNumber: (caseNumber: string) => BookingRequest | undefined
  submitCase: (input: Omit<CreateCaseInput, "calendar">) => BookingRequest
  assign: (caseId: string, staffId: string) => void
  approve: (caseId: string, overrideReason?: string) => void
  confirmPayment: (caseId: string) => void
  reject: (caseId: string, reason: string) => void
  requestInfo: (caseId: string, message: string) => void
  adjustPrice: (caseId: string, amount: number, reason: string) => void
  proposeAlternative: (caseId: string, proposal: string) => void
  replyAsApplicant: (caseId: string, body: string) => void
  resetDemo: () => void
}

export const KirkeFlowContext = createContext<KirkeFlowContextValue | null>(null)
