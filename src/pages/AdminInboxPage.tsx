import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Inbox } from "lucide-react"

import { CaseDetail } from "@/components/caseflow/CaseDetail"
import { CaseList } from "@/components/caseflow/CaseList"
import { InboxStats } from "@/components/caseflow/InboxStats"
import { PageHeading } from "@/components/layout/PageHeading"
import { Button } from "@/components/ui/button"
import { useRental } from "@/context/useRental"
import { usePageTitle } from "@/lib/usePageTitle"
import { cn } from "@/lib/utils"

export function AdminInboxPage() {
  const { requestId } = useParams()
  const { state, stats, getRequest } = useRental()

  const selected = requestId ? getRequest(requestId) : undefined
  const hasSelection = requestId !== undefined

  usePageTitle(selected ? `Sak ${selected.reference}` : "Intern innboks")

  return (
    <div className="animate-fade mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <PageHeading
        eyebrow="Intern saksflyt"
        title="Intern saksinnboks"
        description="Behandle innkomne forespørsler, følg opp søkere og hold oversikt over oppgavene som oppstår ved godkjenning."
      />

      <InboxStats stats={stats} />

      <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-8">
        <div className={cn(hasSelection && "hidden lg:block")}>
          <CaseList requests={state.requests} selectedId={requestId ?? null} />
        </div>

        <div className={cn(!hasSelection && "hidden lg:block")}>
          {selected ? (
            <CaseDetail key={selected.id} request={selected} />
          ) : hasSelection ? (
            <div className="glass-card flex flex-col items-start gap-4 p-8">
              <h2 className="text-xl font-semibold">Fant ikke saken</h2>
              <p className="text-muted-foreground">
                Saken finnes ikke i denne nettleserøkten. Den kan ha blitt
                fjernet ved nullstilling av demoen.
              </p>
              <Button variant="outline" asChild>
                <Link to="/admin">
                  <ArrowLeft aria-hidden="true" />
                  Tilbake til innboksen
                </Link>
              </Button>
            </div>
          ) : (
            <div className="glass-card flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
                <Inbox className="size-7" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold">Velg en sak</h2>
              <p className="max-w-sm text-muted-foreground">
                Klikk på en forespørsel i listen for å se detaljer, behandle
                saken og følge opp oppgaver.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
