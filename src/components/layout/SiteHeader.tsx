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
import { useKirkeFlow } from "@/context/useKirkeFlow"

const NAV_LINK_CLASS =
  "glass-navigation inline-flex h-11 items-center gap-2 rounded-full px-4 text-base font-medium outline-none"

export function SiteHeader() {
  const { stats, resetDemo } = useKirkeFlow()
  const [resetOpen, setResetOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleReset() {
    resetDemo()
    setResetOpen(false)
    toast.success("Demoen er tilbakestilt", {
      description: "De opprinnelige fiktive sakene er gjenopprettet.",
    })
    navigate(location.pathname.startsWith("/saksbehandling") ? "/saksbehandling" : "/")
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
        className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(10,42,40,0.95)_0%,rgba(25,59,60,0.86)_38%,rgba(25,59,60,0.66)_70%,rgba(25,59,60,0.52)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-[rgba(10,42,40,0.55)] to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[rgba(10,42,40,0.78)] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-16 -left-10 -z-10 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent_72%)]"
        aria-hidden="true"
      />

      <div
        className="flex items-center justify-center gap-2 border-b border-white/15 bg-primary/60 px-4 py-1.5 text-center text-sm font-medium"
        role="note"
        aria-label="Prototypeinformasjon"
      >
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        Frontend-prototype · fiktive data og fiktive regler · ingenting sendes eksternt
      </div>

      <div className="mx-auto flex min-h-44 max-w-[95rem] flex-col justify-between gap-6 px-4 py-6 sm:min-h-52 sm:px-6 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            aria-label="KirkeFlow – til forsiden"
          >
            <span className="glass-navigation grid size-12 place-items-center rounded-2xl sm:size-14">
              <Church className="size-6 sm:size-7" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              <span className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                KirkeFlow
              </span>
              <span className="text-base text-white/85 sm:text-lg">
                Finn lokale, få pris, følg saken
              </span>
            </span>
          </NavLink>

          <Button variant="glass" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw aria-hidden="true" />
            Tilbakestill demo
          </Button>
        </div>

        <nav aria-label="Hovednavigasjon" className="flex flex-wrap gap-2">
          <NavLink to="/" end className={NAV_LINK_CLASS}>
            <PenLine className="size-4" aria-hidden="true" />
            Ny forespørsel
          </NavLink>
          <NavLink to="/saksbehandling" className={NAV_LINK_CLASS}>
            <Inbox className="size-4" aria-hidden="true" />
            Saksbehandlerdemo
            {stats.awaitingReview > 0 && (
              <span className="grid min-w-6 place-items-center rounded-full bg-action px-1.5 text-sm font-semibold text-action-foreground">
                <span aria-hidden="true">{stats.awaitingReview}</span>
                <span className="sr-only">{stats.awaitingReview} saker til vurdering</span>
              </span>
            )}
          </NavLink>
        </nav>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tilbakestille demoen?</DialogTitle>
            <DialogDescription>
              Alle forespørsler du har sendt inn og all saksbehandling i denne nettleseren
              fjernes. De opprinnelige fiktive sakene gjenopprettes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Avbryt
            </Button>
            <Button variant="action" onClick={handleReset}>
              <RotateCcw aria-hidden="true" />
              Tilbakestill demo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
