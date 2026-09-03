import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  ScrollText,
  Users,
} from "lucide-react"

import { AvailabilityPanel } from "@/components/case/AvailabilityPanel"
import { CaseActions } from "@/components/case/CaseActions"
import { ComplexityBadge } from "@/components/case/ComplexityBadge"
import { PriceBreakdown } from "@/components/case/PriceBreakdown"
import { StatusBadge } from "@/components/case/StatusBadge"
import { SuitabilityBadge } from "@/components/venue/SuitabilityBadge"
import { PageHeading } from "@/components/layout/PageHeading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import { getEventType } from "@/domain/event"
import { FACILITY_LABELS, VENUE_TYPE_LABELS, getVenue } from "@/domain/venue"
import { staffName } from "@/data/staff"
import { mailtoHref, telHref } from "@/lib/contactLinks"
import {
  capitalize,
  formatDateTime,
  formatLongDate,
  formatMinutes,
} from "@/lib/formatters"
import { usePageTitle } from "@/lib/usePageTitle"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium break-words">{children}</dd>
    </div>
  )
}

export function AdminCasePage() {
  const { caseId } = useParams()
  const { getCase } = useKirkeFlow()
  const request = caseId ? getCase(caseId) : undefined

  usePageTitle(request ? `Sak ${request.caseNumber}` : "Fant ikke saken")

  if (!request) {
    return (
      <div className="animate-rise mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <PageHeading
          title="Fant ikke saken"
          description="Saken finnes ikke i denne demoen. Den kan ha blitt fjernet da demoen ble tilbakestilt."
        />
        <Button variant="outline" asChild className="self-start">
          <Link to="/saksbehandling">
            <ArrowLeft aria-hidden="true" />
            Tilbake til innboksen
          </Link>
        </Button>
      </div>
    )
  }

  const venue = getVenue(request.venueId)
  const eventType = getEventType(request.needs.eventType)
  const alternatives = request.recommendedVenueIds.filter((id) => id !== request.venueId)

  return (
    <div className="animate-rise mx-auto flex max-w-[95rem] flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to="/saksbehandling">
          <ArrowLeft aria-hidden="true" />
          Tilbake til innboksen
        </Link>
      </Button>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-normal text-primary sm:text-2xl">
              {request.caseNumber}
            </h1>
            <StatusBadge status={request.status} />
            <ComplexityBadge level={request.complexity.level} />
          </div>
          <p className="text-base text-muted-foreground">
            {eventType.label} i {venue.name} ·{" "}
            {capitalize(formatLongDate(request.needs.date))} · Ansvarlig:{" "}
            <strong className="text-foreground">{staffName(request.assignedTo)}</strong>
          </p>
        </div>

        <CaseActions request={request} />

        {request.status === "avslatt" && (
          <p className="glass-panel border-danger-border bg-danger-soft/80 p-4 text-base text-danger">
            Saken er avslått og kan ikke behandles videre. Begrunnelsen står i historikken.
          </p>
        )}
        {request.status === "bekreftet" && (
          <p className="glass-panel border-success-border bg-success-soft/80 p-4 text-base text-success">
            Reservasjonen er bekreftet og saken er avsluttet.
          </p>
        )}
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                Arrangementet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Type">{eventType.label}</Field>
                <Field label="Antall personer">{request.needs.expectedAttendees}</Field>
                <Field label="Dato">{capitalize(formatLongDate(request.needs.date))}</Field>
                <Field label="Tidspunkt">
                  kl. {request.needs.startTime}–{request.needs.endTime}
                </Field>
                <Field label="Klargjøring og rydding">
                  {formatMinutes(request.needs.setupMinutes)} før,{" "}
                  {formatMinutes(request.needs.cleanupMinutes)} etter
                </Field>
                <Field label="Lokalet blokkeres">
                  kl. {request.availability.blockedFrom}–{request.availability.blockedTo}
                </Field>
              </dl>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Beskrivelse fra søker</span>
                <p className="surface-solid p-4 text-base leading-relaxed whitespace-pre-line">
                  {request.needs.description}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Oppgitte behov</span>
                {request.needs.requiredFacilities.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {request.needs.requiredFacilities.map((f) => (
                      <li
                        key={f}
                        className="rounded-full border border-primary/15 bg-primary-soft/60 px-2.5 py-0.5 text-sm text-primary"
                      >
                        {FACILITY_LABELS[f]}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Ingen særskilte behov oppgitt.</p>
                )}
                {request.needs.otherNeeds.trim().length > 0 && (
                  <p className="surface-solid p-3 text-base">{request.needs.otherNeeds}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Egnethetsvurdering</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-medium">
                  Valgt lokale: {venue.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({VENUE_TYPE_LABELS[venue.type]}, {venue.seatedCapacity} plasser)
                  </span>
                </span>
                <SuitabilityBadge
                  verdict={request.suitability.verdict}
                  score={request.suitability.score}
                />
              </div>

              <ul className="flex flex-col gap-1.5">
                {request.suitability.reasons.map((r, i) => (
                  <li key={`${r.rule}-${i}`} className="flex items-start gap-2 text-base">
                    <span
                      className={
                        r.kind === "mangel"
                          ? "mt-1.5 size-2 shrink-0 rounded-full bg-danger"
                          : r.kind === "advarsel"
                            ? "mt-1.5 size-2 shrink-0 rounded-full bg-warning"
                            : "mt-1.5 size-2 shrink-0 rounded-full bg-success"
                      }
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-medium">{r.rule}:</span> {r.text}
                    </span>
                  </li>
                ))}
              </ul>

              {alternatives.length > 0 && (
                <>
                  <Separator className="bg-primary/10" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      Motoren anbefalte også
                    </span>
                    <ul className="flex flex-wrap gap-2">
                      {alternatives.map((id) => (
                        <li
                          key={id}
                          className="glass-panel px-3 py-1.5 text-base"
                        >
                          {getVenue(id).name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" aria-hidden="true" />
                Kalenderkontroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityPanel
                slot={request.availability}
                setupMinutes={request.needs.setupMinutes}
                cleanupMinutes={request.needs.cleanupMinutes}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prisberegning</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceBreakdown estimate={request.price} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" aria-hidden="true" />
                Meldinger med søker
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.messages.length === 0 ? (
                <p className="text-muted-foreground">Ingen meldinger utvekslet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {request.messages.map((m) => (
                    <li
                      key={m.id}
                      className={
                        m.from === "saksbehandler"
                          ? "glass-panel ml-auto max-w-[85%] border-primary/15 bg-primary-soft/60 p-3.5"
                          : "surface-solid mr-auto max-w-[85%] p-3.5"
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
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="size-5 text-primary" aria-hidden="true" />
                Søker
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <dl className="flex flex-col gap-3">
                <Field label="Navn">
                  {request.applicant.name}
                  {request.applicant.organization && (
                    <span className="block text-sm font-normal text-muted-foreground">
                      {request.applicant.organization}
                    </span>
                  )}
                </Field>
                <Field label="E-post">
                  <ContactLink href={mailtoHref(request.applicant.email)} icon={Mail}>
                    {request.applicant.email}
                  </ContactLink>
                </Field>
                <Field label="Telefon">
                  <ContactLink href={telHref(request.applicant.phone)} icon={Phone}>
                    {request.applicant.phone}
                  </ContactLink>
                </Field>
              </dl>
              <Button variant="outline" size="sm" asChild className="self-start">
                <Link to={`/sak/${request.id}`}>
                  <ExternalLink aria-hidden="true" />
                  Se søkerens statusside
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kompleksitet</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <div className="flex items-center justify-between gap-2">
                <ComplexityBadge level={request.complexity.level} />
                <span className="text-sm text-muted-foreground">
                  {request.complexity.score} poeng
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {request.complexity.factors.map((f) => (
                  <li key={f.label} className="flex justify-between gap-3 text-base">
                    <span>{f.label}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      +{f.points}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Nivået beskriver hvor mye arbeid saken krever, ikke søkeren.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CircleAlert className="size-5 text-warning" aria-hidden="true" />
                Manglende informasjon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.missingInfo.length === 0 ? (
                <p className="text-muted-foreground">
                  Ingenting mangler. Saken kan avgjøres på grunnlaget som foreligger.
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-base">
                  {request.missingInfo.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="size-5 text-primary" aria-hidden="true" />
                Historikk og revisjonslogg
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {[...request.events].reverse().map((e, index, arr) => (
                  <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < arr.length - 1 && (
                      <span
                        className="absolute top-7 bottom-0 left-[0.6875rem] w-px bg-primary/15"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className="relative z-10 mt-1 size-6 shrink-0 rounded-full bg-primary-soft ring-4 ring-white/70"
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-base leading-snug">{e.message}</span>
                      <span className="text-sm text-muted-foreground">
                        {e.actor} · {formatDateTime(e.timestamp)}
                        {e.fromStatus && e.toStatus && (
                          <> · {e.fromStatus} → {e.toStatus}</>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ContactLink({
  href,
  icon: Icon,
  children,
}: {
  href: string | null
  icon: typeof Mail
  children: ReactNode
}) {
  if (!href) return <>{children}</>
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </a>
  )
}
