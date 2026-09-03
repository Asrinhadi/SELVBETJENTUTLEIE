import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react"

import type { CreateCaseInput } from "@/domain/caseflow"
import { CURRENT_STAFF_ID, staffName } from "@/data/staff"
import {
  buildCase,
  createInitialState,
  kirkeflowReducer,
  type KirkeFlowState,
} from "@/context/kirkeflowReducer"
import {
  clearPersistedState,
  loadPersistedState,
  persistState,
} from "@/context/persistence"
import {
  KirkeFlowContext,
  type InboxStats,
  type KirkeFlowContextValue,
} from "@/context/kirkeflowContextValue"

function initState(): KirkeFlowState {
  return loadPersistedState() ?? createInitialState()
}

interface ProviderProps {
  children: ReactNode
  /** Brukes i tester for å starte fra en kjent tilstand uten lagring. */
  initialState?: KirkeFlowState
}

export function KirkeFlowProvider({ children, initialState }: ProviderProps) {
  const [state, dispatch] = useReducer(
    kirkeflowReducer,
    initialState,
    (provided) => provided ?? initState(),
  )

  useEffect(() => {
    persistState(state)
  }, [state])

  const now = () => new Date().toISOString()
  const currentStaffName = staffName(CURRENT_STAFF_ID)

  const getCase = useCallback(
    (caseId: string) => state.cases.find((c) => c.id === caseId),
    [state.cases],
  )

  const getCaseByNumber = useCallback(
    (caseNumber: string) =>
      state.cases.find((c) => c.caseNumber.toLowerCase() === caseNumber.toLowerCase()),
    [state.cases],
  )

  const submitCase = useCallback(
    (input: Omit<CreateCaseInput, "calendar">) => {
      const request = buildCase(state, input, new Date())
      dispatch({ type: "case/created", request })
      return request
    },
    [state],
  )

  const assign = useCallback((caseId: string, staffId: string) => {
    dispatch({
      type: "case/assigned",
      caseId,
      staffId,
      staffName: staffName(staffId),
      at: new Date().toISOString(),
    })
  }, [])

  const approve = useCallback(
    (caseId: string) => {
      dispatch({ type: "case/approved", caseId, staffName: currentStaffName, at: now() })
    },
    [currentStaffName],
  )

  const confirmPayment = useCallback(
    (caseId: string) => {
      dispatch({
        type: "case/paymentConfirmed",
        caseId,
        staffName: currentStaffName,
        at: now(),
      })
    },
    [currentStaffName],
  )

  const reject = useCallback(
    (caseId: string, reason: string) => {
      dispatch({ type: "case/rejected", caseId, reason, staffName: currentStaffName, at: now() })
    },
    [currentStaffName],
  )

  const requestInfo = useCallback(
    (caseId: string, message: string) => {
      dispatch({
        type: "case/infoRequested",
        caseId,
        message,
        staffName: currentStaffName,
        at: now(),
      })
    },
    [currentStaffName],
  )

  const adjustPrice = useCallback(
    (caseId: string, amount: number, reason: string) => {
      dispatch({
        type: "case/priceAdjusted",
        caseId,
        amount,
        reason,
        staffName: currentStaffName,
        at: now(),
      })
    },
    [currentStaffName],
  )

  const proposeAlternative = useCallback(
    (caseId: string, proposal: string) => {
      dispatch({
        type: "case/alternativeProposed",
        caseId,
        proposal,
        staffName: currentStaffName,
        at: now(),
      })
    },
    [currentStaffName],
  )

  const replyAsApplicant = useCallback((caseId: string, body: string) => {
    dispatch({ type: "case/applicantReplied", caseId, body, at: new Date().toISOString() })
  }, [])

  const resetDemo = useCallback(() => {
    clearPersistedState()
    dispatch({ type: "demo/reset" })
  }, [])

  const stats = useMemo<InboxStats>(
    () => ({
      total: state.cases.length,
      awaitingReview: state.cases.filter(
        (c) => c.status === "venter_vurdering" || c.status === "automatisk_kontroll",
      ).length,
      awaitingApplicant: state.cases.filter((c) => c.status === "tilleggsinfo_etterspurt")
        .length,
      withConflict: state.cases.filter((c) => c.availability.conflicts.length > 0).length,
      unassigned: state.cases.filter((c) => c.assignedTo === null).length,
    }),
    [state.cases],
  )

  const value = useMemo<KirkeFlowContextValue>(
    () => ({
      state,
      stats,
      getCase,
      getCaseByNumber,
      submitCase,
      assign,
      approve,
      confirmPayment,
      reject,
      requestInfo,
      adjustPrice,
      proposeAlternative,
      replyAsApplicant,
      resetDemo,
    }),
    [
      state,
      stats,
      getCase,
      getCaseByNumber,
      submitCase,
      assign,
      approve,
      confirmPayment,
      reject,
      requestInfo,
      adjustPrice,
      proposeAlternative,
      replyAsApplicant,
      resetDemo,
    ],
  )

  return <KirkeFlowContext.Provider value={value}>{children}</KirkeFlowContext.Provider>
}
