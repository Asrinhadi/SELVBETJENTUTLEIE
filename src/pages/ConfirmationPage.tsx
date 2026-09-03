import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  MailCheck,
  PenLine,
  SearchCheck,
} from "lucide-react"

import { AvailabilityBadge } from "@/components/booking/AvailabilityBadge"
import { PageHeading } from "@/components/layout/PageHeading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useRental } from "@/context/useRental"
import { getBuilding, getPurpose } from "@/domain/rental"
import { assessAvailability } from "@/lib/availability"
import {
  capitalize,
  formatLongDate,
  formatPriceEstimate,
  formatTimeRange,
} from "@/lib/formatters"
import { calculatePrice } from "@/lib/pricing"
import { usePageTitle } from "@/lib/usePageTitle"

const NEXT_STEPS = [
  {
    icon: SearchCheck,
    title: "Saksbehandler vurderer forespørselen",
    text: "Vi sjekker kalenderen og om formålet passer i lokalet. Du får normalt svar innen tre virkedager.",
  },
  {
    icon: MailCheck,
    title: "Du får svar på e-post",
    text: "Enten en bekreftelse, et avslag med begrunnelse, eller spørsmål hvis vi trenger mer informasjon.",
  },
  {
    icon: ClipboardCheck,
    title: "Kontrakt og praktisk avklaring",
    text: "Ved godkjenning sender vi kontrakt og avtaler nøkler og fakturering.",
  },
]

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:text-right">{value}</dd>
    </div>
  )
}

export function ConfirmationPage() {
  const { requestId } = useParams()
  const { getRequest } = useRental()
  const request = requestId ? getRequest(requestId) : undefined

  usePageTitle(request ? `Bekreftelse ${request.reference}` : "Fant ikke forespørselen")

  if (!request) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <PageHeading
          title="Fant ikke forespørselen"
          description="Forespørselen finnes ikke i denne nettleserøkten. Den kan ha blitt fjernet ved nullstilling av demoen."
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="action" asChild>
            <Link to="/">
              <PenLine aria-hidden="true" />
              Send ny forespørsel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin">
              <Inbox aria-hidden="true" />
              Gå til intern innboks
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const building = getBuilding(request.buildingId)
  const purpose = getPurpose(request.purposeId)
  const availability = assessAvailability(request)
  const price = calculatePrice(request)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-11" aria-hidden="true" strokeWidth={2.2} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">Forespørselen er mottatt</h1>
          <p className="text-lg text-muted-foreground">
            Takk, {request.applicant.name}. Vi har registrert forespørselen din.
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-primary/15 bg-primary-soft px-6 py-4">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Referansenummer
          </span>
          <span className="font-mono text-3xl font-semibold text-primary">
            {request.reference}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Oppsummering</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3">
              <SummaryRow label="Bygg" value={building.name} />
              <SummaryRow label="Dato" value={capitalize(formatLongDate(request.date))} />
              <SummaryRow
                label="Tidspunkt"
                value={formatTimeRange(request.startTime, request.endTime)}
              />
              <SummaryRow label="Formål" value={purpose.label} />
              <Separator />
              <SummaryRow
                label="Indikativ tilgjengelighet"
                value={<AvailabilityBadge status={availability.status} />}
              />
              <SummaryRow
                label="Foreløpig pris"
                value={<span className="text-primary">{formatPriceEstimate(price)}</span>}
              />
            </dl>
            <p className="text-sm text-muted-foreground">
              Foreløpig pris er ikke et bindende tilbud. Lokalet er ikke reservert
              før du får bekreftelse.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hva skjer videre?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-4">
              {NEXT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {index + 1}. {step.title}
                    </span>
                    <span className="text-sm text-muted-foreground">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="default" size="lg" asChild>
          <Link to={`/admin/saker/${request.id}`}>
            <Inbox aria-hidden="true" />
            Følg saken i intern innboks
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/">
            <PenLine aria-hidden="true" />
            Send ny forespørsel
          </Link>
        </Button>
      </div>
    </div>
  )
}
