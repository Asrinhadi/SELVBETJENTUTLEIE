import { useContext } from "react"

import { RentalContext, type RentalContextValue } from "@/context/rentalContextValue"

export function useRental(): RentalContextValue {
  const context = useContext(RentalContext)
  if (!context) {
    throw new Error("useRental må brukes innenfor <RentalProvider>.")
  }
  return context
}
