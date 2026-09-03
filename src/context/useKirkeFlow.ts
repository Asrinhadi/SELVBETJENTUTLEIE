import { useContext } from "react"

import {
  KirkeFlowContext,
  type KirkeFlowContextValue,
} from "@/context/kirkeflowContextValue"

export function useKirkeFlow(): KirkeFlowContextValue {
  const context = useContext(KirkeFlowContext)
  if (!context) {
    throw new Error("useKirkeFlow må brukes innenfor <KirkeFlowProvider>.")
  }
  return context
}
