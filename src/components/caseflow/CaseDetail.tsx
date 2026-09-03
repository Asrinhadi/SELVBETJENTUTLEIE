import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileCheck,
  Mail,
  Megaphone,
  Phone,
  UserRound,
} from "lucide-react"

import { AvailabilityBadge } from "@/components/booking/AvailabilityBadge"
import { CaseActions } from "@/components/caseflow/CaseActions"
import { CaseHistory } from "@/components/caseflow/CaseHistory"
import { StatusBadge } from "@/components/caseflow/StatusBadge"
import { TaskList } from "@/components/tasks/TaskList"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useRental } from "@/context/useRental"
import { getBuilding, getPurpose, type RentalRequest } from "@/domain/rental"
import { assessAvailability } from "@/lib/availability"
import {
  capitalize,
  formatCurrency,
  formatDateTime,
  formatLongDate,
  formatPriceEstimate,
  formatTimeRange,
} from "@/lib/formatters"
import { calculatePrice, describePriceEstimate } from "@/lib/pricing"

interface CaseDetailProps {
  request: RentalRequest
}

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-base font-medium break-words">{children}</dd>
      </div>
    </div>
  )
}

export function CaseDetail({ request }: CaseDetailProps) {
  const { toggleTask } = useRental()
  const building = getBuilding(request.buildingId)
  const purpose = getPurpose(request.purposeId)
  const availability = assessAvailability(request)
  const price = calculatePrice(request)

  return (
    <article aria-labelledby="sak-tittel" className="flex flex-col gap-5">
      <div className="lg:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin">
            <ArrowLeft aria-hidden="true" />
            Tilbake til listen
          </Link>
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="sak-tittel" className="font-mono text-2xl font-semibold text-primary">
              {request.reference}
            </h2>
            <StatusBadge status={request.status} />
            {request.confirmationCreated && (
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <FileCheck className="size-4" aria-hidden="true" />
                Bekreftelse opprettet
              </span>
            )}
          </div>
          <p className="text-base text-muted-foreground">
            Mottatt {formatDateTime(request.createdAt)}
          </p>
        </div>

        <CaseActions request={request} />

        {request.status === "rejected" && (
          <p className="rounded-lg border border-danger-border bg-danger-soft p-4 text-base text-danger">
            Saken er avslått og kan ikke behandles videre. Se begrunnelsen i
            sakshistorikken.
          </p>
        )}

        <Separator />

        <CardContent className="gap-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Bygg">
              {building.name}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                (prisgruppe {building.priceGroup})
              </span>
            </DetailItem>
            <DetailItem icon={Megaphone} label="Formål">
              {purpose.label}
            </DetailItem>
            <DetailItem icon={CalendarDays} label="Dato">
              {capitalize(formatLongDate(request.date))}
            </DetailItem>
            <DetailItem icon={Clock} label="Tidspunkt">
              {formatTimeRange(request.startTime, request.endTime)}
            </DetailItem>
          </dl>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-4">
              <span className="text-sm font-semibold text-muted-foreground">
                Indikativ tilgjengelighet
              </span>
              <AvailabilityBadge status={availability.status} />
              <p className="text-sm text-muted-foreground">{availability.reason}</p>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-primary/15 bg-primary-soft/60 p-4">
              <span className="text-sm font-semibold text-muted-foreground">Foreløpig pris</span>
              <span className="text-2xl font-semibold text-primary">
                {formatPriceEstimate(price)}
              </span>
              <p className="text-sm text-muted-foreground">{describePriceEstimate(price)}</p>
              {request.estimatedTicketRevenue !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Oppgitt billettinntekt: {formatCurrency(request.estimatedTicketRevenue)}
                </p>
              )}
            </div>
          </div>

          <section aria-labelledby="soker-tittel" className="flex flex-col gap-3">
            <h3 id="soker-tittel" className="text-lg font-semibold">
              Søker
            </h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem icon={UserRound} label="Navn">
                {request.applicant.name}
                {request.applicant.organization && (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {request.applicant.organization}
                  </span>
                )}
              </DetailItem>
              <DetailItem icon={Mail} label="E-post">
                <a
                  href={`mailto:${request.applicant.email}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {request.applicant.email}
                </a>
              </DetailItem>
              <DetailItem icon={Phone} label="Telefon">
                <a
                  href={`tel:${request.applicant.phone.replace(/\s/g, "")}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {request.applicant.phone}
                </a>
              </DetailItem>
            </dl>
          </section>

          <section aria-labelledby="beskrivelse-tittel" className="flex flex-col gap-2">
            <h3 id="beskrivelse-tittel" className="text-lg font-semibold">
              Beskrivelse fra søker
            </h3>
            <p className="rounded-lg border border-border bg-background p-4 text-base leading-relaxed whitespace-pre-line">
              {request.description}
            </p>
          </section>

          {request.tasks.length > 0 && (
            <TaskList
              tasks={request.tasks}
              onToggle={(taskId, completed) => toggleTask(request.id, taskId, completed)}
            />
          )}

          <CaseHistory history={request.history} />
        </CardContent>
      </Card>
    </article>
  )
}
