import { createContext } from "react"

import type { RentalRequest, RentalRequestInput } from "@/domain/rental"
import type { RentalState } from "@/context/rentalReducer"

export interface InboxStats {
  newCount: number
  waitingCount: number
  openTaskCount: number
}

export interface RentalContextValue {
  state: RentalState
  stats: InboxStats
  getRequest: (requestId: string) => RentalRequest | undefined
  submitRequest: (input: RentalRequestInput) => RentalRequest
  approve: (requestId: string) => void
  reject: (requestId: string, reason: string) => void
  requestInfo: (requestId: string, message: string) => void
  toggleTask: (requestId: string, taskId: string, completed: boolean) => void
  resetDemo: () => void
}

export const RentalContext = createContext<RentalContextValue | null>(null)
