import { Outlet } from "react-router-dom"

import { SiteHeader } from "@/components/layout/SiteHeader"
import { SiteFooter } from "@/components/layout/SiteFooter"

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#hovedinnhold"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Hopp til hovedinnhold
      </a>
      <SiteHeader />
      <main id="hovedinnhold" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
