import { ShieldCheck } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="glass-panel rounded-none border-x-0 border-b-0">
      <div className="mx-auto flex max-w-[95rem] flex-col items-center gap-2 px-4 py-6 text-center sm:px-6">
        <p className="flex items-start gap-2 text-base font-medium text-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          Dette er en frontend-prototype med fiktive data. Ingen forespørsler sendes eller
          lagres eksternt.
        </p>
        <p className="text-sm text-muted-foreground">
          Alt du fyller inn blir liggende i din egen nettleser til fanen lukkes, og forsvinner
          når du tilbakestiller demoen. Alle lokaler, kalenderoppføringer, regler og priser er
          oppdiktet for prototypen.
        </p>
        <p className="text-base text-muted-foreground">
          Uavhengig prototype. Ikke tilknyttet et produksjonssystem. Laget av A-Hadi
        </p>
      </div>
    </footer>
  )
}
