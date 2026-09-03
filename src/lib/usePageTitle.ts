import { useEffect } from "react"

const BASE_TITLE = "Kirkeutleie – digital forespørsel og intern saksflyt"

export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Kirkeutleie` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
