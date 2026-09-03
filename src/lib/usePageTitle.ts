import { useEffect } from "react"

const BASE_TITLE = "KirkeFlow – finn lokale, få pris, følg saken"

export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · KirkeFlow` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
