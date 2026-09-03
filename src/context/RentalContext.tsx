import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react"

import type { RentalRequestInput } from "@/domain/rental"
import { createRentalRequest, countOpenTasks } from "@/lib/caseflow"
import {
  clearPersistedState,
  loadPersistedState,
  persistState,
} from "@/context/persistence"
import {
  createInitialState,
  rentalReducer,
  type RentalState,
} from "@/context/rentalReducer"
import {
  RentalContext,
  type InboxStats,
  type RentalContextValue,
} from "@/context/rentalContextValue"

function initState(): RentalState {
  return loadPersistedState() ?? createInitialState()
}

interface RentalProviderProps {
  children: ReactNode
  /** Brukes i tester for å starte fra en kjent tilstand uten sessionStorage. */
  initialState?: RentalState
}

export function RentalProvider({ children, initialState }: RentalProviderProps) {
  const [state, dispatch] = useReducer(
    rentalReducer,
    initialState,
    (provided) => provided ?? initState(),
  )

  useEffect(() => {
    persistState(state)
  }, [state])

  const getRequest = useCallback(
    (requestId: string) => state.requests.find((r) => r.id === requestId),
    [state.requests],
  )

  const submitRequest = useCallback(
    (input: RentalRequestInput) => {
      const request = createRentalRequest(input, state.nextSequence, new Date())
      dispatch({ type: "request/submitted", request })
      return request
    },
    [state.nextSequence],
  )

  const approve = useCallback((requestId: string) => {
    dispatch({ type: "request/approved", requestId, at: new Date().toISOString() })
  }, [])

  const reject = useCallback((requestId: string, reason: string) => {
    dispatch({
      type: "request/rejected",
      requestId,
      reason,
      at: new Date().toISOString(),
    })
  }, [])

  const requestInfo = useCallback((requestId: string, message: string) => {
    dispatch({
      type: "request/infoRequested",
      requestId,
      message,
      at: new Date().toISOString(),
    })
  }, [])

  const toggleTask = useCallback(
    (requestId: string, taskId: string, completed: boolean) => {
      dispatch({
        type: "task/toggled",
        requestId,
        taskId,
        completed,
        at: new Date().toISOString(),
      })
    },
    [],
  )

  const resetDemo = useCallback(() => {
    clearPersistedState()
    dispatch({ type: "demo/reset" })
  }, [])

  const stats = useMemo<InboxStats>(
    () => ({
      newCount: state.requests.filter((r) => r.status === "new").length,
      waitingCount: state.requests.filter((r) => r.status === "needs_info").length,
      openTaskCount: countOpenTasks(state.requests),
    }),
    [state.requests],
  )

  const value = useMemo<RentalContextValue>(
    () => ({
      state,
      stats,
      getRequest,
      submitRequest,
      approve,
      reject,
      requestInfo,
      toggleTask,
      resetDemo,
    }),
    [state, stats, getRequest, submitRequest, approve, reject, requestInfo, toggleTask, resetDemo],
  )

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>
}
