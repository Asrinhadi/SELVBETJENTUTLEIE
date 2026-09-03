import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { CheckCircle2, Clock, Inbox, MessageSquare, PenLine, Send } from "lucide-react"
import { toast } from "sonner"

import { AvailabilityBadge } from "@/components/case/AvailabilityBadge"
import { CaseTimeline } from "@/components/case/CaseTimeline"
import { PriceBreakdown } from "@/components/case/PriceBreakdown"
import { StatusBadge } from "@/components/case/StatusBadge"
import { PageHeading } from "@/components/layout/PageHeading"
import { SuitabilityBadge } from "@/components/venue/SuitabilityBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import { CASE_STATUS_LABELS } from "@/domain/case"
import { getEventType } from "@/domain/event"
import { getVenue } from "@/domain/venue"
import { capitalize, formatCurrency, formatDateTime, formatLongDate } from "@/lib/formatters"
import { usePageTitle } from "@/lib/usePageTitle"

/** Fiktiv, veiledende behandlingstid basert på hvor sammensatt saken er. */
const PROCESSING_TIME: Record<string, string> = {
  lav: "2–3 virkedager",
  middels: "3–5 virkedager",
  hoy: "5–10 virkedager",
}

export function CaseStatusPage() {
  const { caseId } = useParams()
  const { getCase, replyAsApplicant } = useKirkeFlow()
  const request = caseId ? getCase(caseId) : undefined
  const [reply, setReply] = useState("")

  usePageTitle(request ? `Sak ${request.caseNumber}` : "Fant ikke saken")

  if (!request) {
    return (
      <div className="animate-rise mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <PageHeading
          title="Fant ikke saken"
          description="Saken finnes ikke i denne demoen. Den kan ha blitt fjernet da demoen ble tilbakestilt."
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="action" asChild>
            <Link to="/">
              <PenLine aria-hidden="true" />
              Send ny forespørsel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/saksbehandling">
              <Inbox aria-hidden="true" />
              Gå til intern innboks
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const venue = getVenue(request.venueId)
  const waitingForApplicant = request.status === "tilleggsinfo_etterspurt"

  function handleReply() {
    if (!request) return
    const body = reply.trim()
    if (body.length < 5) {
      toast.error("Skriv et litt lengre svar")
      return
    }
    replyAsApplicant(request.id, body)
    setReply("")
    toast.success("Svaret er sendt", {
      description: "Saken går tilbake til vurdering hos saksbehandler.",
    })
  }

  return (
    <div className="animate-rise mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full border border-success-border/70 bg-success-soft text-success shadow-[0_16px_40px_-20px_rgba(37,107,69,0.7),inset_0_1px_0_rgba(255,255,255,0.8)] sm:size-20">
          <CheckCircle2 className="size-9 sm:size-11" aria-hidden="true" strokeWidth={2.2} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] font-semibold sm:text-4xl">Forespørselen er mottatt</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Takk, {request.applicant.name}. Saken din er opprettet og ligger til behandling.
          </p>
        </div>
        <div className="glass-card flex flex-col items-center gap-1 rounded-[1.25rem] px-8 py-4">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Saksnummer
          </span>
          <span className="font-mono text-2xl font-semibold tracking-normal text-primary sm:text-3xl">
            {request.caseNumber}
          </span>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Oppsummering</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col divide-y divide-primary/10">
                {[
                  ["Arrangement", getEventType(request.needs.eventType).label],
                  ["Lokale", venue.name],
                  ["Dato", capitalize(formatLongDate(request.needs.date))],
                  [
                    "Tidspunkt",
                    `kl. ${request.needs.startTime}–${request.needs.endTime}`,
                  ],
                  [
                    "Lokalet blokkeres",
                    `kl. ${request.availability.blockedFrom}–${request.availability.blockedTo}`,
                  ],
                  ["Antall personer", `${request.needs.expectedAttendees} personer`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-medium sm:text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <SuitabilityBadge verdict={request.suitability.verdict} />
                <AvailabilityBadge state={request.availability.state} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Foreløpig prisoverslag</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceBreakdown estimate={request.price} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" aria-hidden="true" />
                Meldinger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.messages.length === 0 ? (
                <p className="text-muted-foreground">
                  Ingen meldinger ennå. Saksbehandler tar kontakt hvis vi trenger mer
                  informasjon.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {request.messages.map((m) => (
                    <li
                      key={m.id}
                      className={
                        m.from === "soker"
                          ? "surface-solid ml-auto max-w-[85%] p-3.5"
                          : "glass-panel mr-auto max-w-[85%] border-primary/15 bg-primary-soft/60 p-3.5"
                      }
                    >
                      <p className="text-sm font-medium text-muted-foreground">
                        {m.author} · {formatDateTime(m.timestamp)}
                      </p>
                      <p className="text-base">{m.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              {waitingForApplicant && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="svar">Svar til saksbehandler</Label>
                  <Textarea
                    id="svar"
                    rows={3}
                    maxLength={1000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Skriv svaret ditt her."
                  />
                  <Button variant="action" className="self-start" onClick={handleReply}>
                    <Send aria-hidden="true" />
                    Send svar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
          <Card>
            <CardHeader>
              <CardTitle>Slik går saken videre</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseTimeline request={request} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hva skjer nå?</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <p className="flex items-start gap-2 text-base">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                Forventet behandlingstid:{" "}
                <strong>{PROCESSING_TIME[request.complexity.level] ?? "3–5 virkedager"}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Saken har status «{CASE_STATUS_LABELS[request.status]}». Du får beskjed på
                e-post når den endrer seg. Lokalet er ikke reservert før du får bekreftelse.
              </p>
              <p className="text-sm text-muted-foreground">
                Foreløpig sum: {formatCurrency(request.price.total)}.
              </p>
              <Button variant="outline" asChild className="self-start">
                <Link to={`/saksbehandling/sak/${request.id}`}>
                  <Inbox aria-hidden="true" />
                  Se saken som saksbehandler
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Snarveien over finnes bare i demoen, slik at du kan se begge sider av
                saksgangen.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
