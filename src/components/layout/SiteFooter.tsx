export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-base text-muted-foreground sm:px-6">
        <p>
          Uavhengig studentprototype. Ikke tilknyttet et produksjonssystem, og
          ingen data sendes til Sarpsborg kirkelige fellesråd.
        </p>
        <p className="text-sm">
          Alle navn, kontaktopplysninger og saker i løsningen er fiktive. Data
          lagres kun midlertidig i din egen nettleser (sessionStorage).
        </p>
      </div>
    </footer>
  )
}
