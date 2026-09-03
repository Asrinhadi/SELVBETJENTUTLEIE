import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Church, FlaskConical, Inbox, PenLine, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import headerImage from "@/assets/kirke-header.jpg"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRental } from "@/context/useRental"
import { cn } from "@/lib/utils"

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-base font-medium backdrop-blur-md transition-colors outline-none focus-visible:ring-4 focus-visible:ring-white/50",
    isActive
      ? "border-white bg-white text-primary shadow-md"
      : "border-white/35 bg-white/15 text-white hover:border-white/60 hover:bg-white/25",
  )

export function SiteHeader() {
  const { stats, resetDemo } = useRental()
  const [resetOpen, setResetOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleReset() {
    resetDemo()
    setResetOpen(false)
    toast.success("Demoen er nullstilt", {
      description: "De opprinnelige fiktive sakene er gjenopprettet.",
    })
    navigate(location.pathname.startsWith("/admin") ? "/admin" : "/")
  }

  return (
    <header className="relative isolate overflow-hidden bg-primary text-white">
      <img
        src={headerImage}
        alt=""
        className="absolute inset-0 -z-20 size-full object-cover object-[center_45%]"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-primary/70 to-transparent"
        aria-hidden="true"
      />

      <div
        className="flex items-center justify-center gap-2 bg-primary/70 px-4 py-1.5 text-center text-sm font-medium backdrop-blur-sm"
        role="note"
        aria-label="Prototypeinformasjon"
      >
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        Interaktiv prototype · fiktive data
      </div>

      <div className="mx-auto flex min-h-52 max-w-7xl flex-col justify-between gap-8 px-4 py-7 sm:min-h-64 sm:px-6 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            aria-label="Kirkeutleie – til forsiden"
          >
            <span className="grid size-12 place-items-center rounded-xl border border-white/40 bg-white/15 backdrop-blur-md sm:size-14">
              <Church className="size-6 sm:size-7" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              <span className="text-2xl font-semibold sm:text-3xl">Kirkeutleie</span>
              <span className="text-base text-white/85 sm:text-lg">
                Digital forespørsel og intern saksflyt
              </span>
            </span>
          </NavLink>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
            className="border-white/40 bg-white/15 text-white backdrop-blur-md hover:border-white/60 hover:bg-white/25 hover:text-white focus-visible:ring-white/50"
          >
            <RotateCcw aria-hidden="true" />
            Nullstill demo
          </Button>
        </div>

        <nav aria-label="Hovednavigasjon" className="flex flex-wrap gap-2">
          <NavLink to="/" end className={navLinkClass}>
            <PenLine className="size-4" aria-hidden="true" />
            Ny forespørsel
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            <Inbox className="size-4" aria-hidden="true" />
            Intern innboks
            {stats.newCount > 0 && (
              <span className="grid min-w-6 place-items-center rounded-full bg-action px-1.5 text-sm font-semibold text-action-foreground">
                <span aria-hidden="true">{stats.newCount}</span>
                <span className="sr-only">{stats.newCount} nye saker</span>
              </span>
            )}
          </NavLink>
        </nav>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nullstille demoen?</DialogTitle>
            <DialogDescription>
              Alle forespørsler du har sendt inn og alle saksbehandlinger i
              denne nettleserøkten fjernes. De opprinnelige fiktive sakene
              gjenopprettes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Avbryt
            </Button>
            <Button variant="action" onClick={handleReset}>
              <RotateCcw aria-hidden="true" />
              Nullstill demo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
