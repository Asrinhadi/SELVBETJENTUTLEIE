import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Church, FlaskConical, Inbox, PenLine, RotateCcw } from "lucide-react"
import { toast } from "sonner"

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
    "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-base font-medium transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/35",
    isActive
      ? "bg-primary-soft text-primary"
      : "text-foreground/80 hover:bg-primary-soft/70 hover:text-primary",
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
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85">
      <div
        className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-sm font-medium text-primary-foreground"
        role="note"
        aria-label="Prototypeinformasjon"
      >
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        Interaktiv prototype · fiktive data
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/35"
          aria-label="Kirkeutleie – til forsiden"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Church className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-primary">Kirkeutleie</span>
            <span className="text-sm text-muted-foreground">
              Digital forespørsel og saksflyt
            </span>
          </span>
        </NavLink>

        <nav aria-label="Hovednavigasjon" className="order-3 flex w-full gap-1 sm:order-2 sm:ml-auto sm:w-auto">
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

        <div className="order-2 ml-auto sm:order-3 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw aria-hidden="true" />
            Nullstill demo
          </Button>
        </div>
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
