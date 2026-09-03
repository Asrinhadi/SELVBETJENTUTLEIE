import { Info, Send } from "lucide-react"

import { AvailabilityBadge } from "@/components/booking/AvailabilityBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { AvailabilityAssessment, PriceEstimate } from "@/domain/rental"
import { describePriceEstimate } from "@/lib/pricing"
import { formatPriceEstimate } from "@/lib/formatters"

export interface SummaryData {
  buildingName: string | null
  dateLabel: string | null
  timeLabel: string | null
  purposeLabel: string | null
  availability: AvailabilityAssessment | null
  price: PriceEstimate | null
  completedFields: number
  totalFields: number
}

interface SummaryPanelProps {
  data: SummaryData
  formId: string
  isSubmitting: boolean
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium sm:text-right" : "text-muted-foreground/70 sm:text-right"}>
        {value ?? "Ikke valgt"}
      </dd>
    </div>
  )
}

export function SummaryPanel({ data, formId, isSubmitting }: SummaryPanelProps) {
  const progress = Math.round((data.completedFields / data.totalFields) * 100)

  return (
    <Card aria-labelledby="oppsummering-tittel" className="gap-4">
      <CardHeader>
        <CardTitle id="oppsummering-tittel">Oppsummering</CardTitle>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Utfylt</span>
            <span>
              {data.completedFields} av {data.totalFields} felt
            </span>
          </div>
          <Progress
            value={progress}
            aria-label={`Skjemaet er ${progress} % utfylt`}
            className="h-2"
          />
        </div>
      </CardHeader>

      <CardContent className="gap-4">
        <section
          aria-live="polite"
          aria-atomic="true"
          className="glass-inset flex flex-col gap-2 rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-muted-foreground">
            Indikativ tilgjengelighet
          </h3>
          {data.availability ? (
            <>
              <AvailabilityBadge status={data.availability.status} />
              <p className="text-sm text-muted-foreground">{data.availability.reason}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Velg dato og tidspunkt for å få en indikasjon.
            </p>
          )}
          <p className="text-sm text-muted-foreground/90">
            Demo-kalender – resultatet reserverer ikke lokalet.
          </p>
        </section>

        <section
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-col gap-1 rounded-xl border border-primary/15 bg-primary-soft/70 p-4"
        >
          <h3 className="text-sm font-semibold text-muted-foreground">Foreløpig pris</h3>
          {data.price ? (
            <>
              <p className="text-3xl font-semibold text-primary">
                {formatPriceEstimate(data.price)}
              </p>
              <p className="text-sm text-muted-foreground">
                {describePriceEstimate(data.price)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Velg bygg og formål for å se foreløpig pris.
            </p>
          )}
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Beløpet er et foreløpig estimat og ikke et bindende tilbud. Endelig
            pris bekreftes av saksbehandler.
          </p>
        </section>

        <Separator />

        <dl className="flex flex-col gap-2.5">
          <SummaryRow label="Bygg" value={data.buildingName} />
          <SummaryRow label="Dato" value={data.dateLabel} />
          <SummaryRow label="Tidspunkt" value={data.timeLabel} />
          <SummaryRow label="Formål" value={data.purposeLabel} />
        </dl>

        <Button
          type="submit"
          form={formId}
          variant="action"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          <Send aria-hidden="true" />
          {isSubmitting ? "Sender …" : "Send forespørsel"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Du forplikter deg ikke til noe ved å sende forespørselen.
        </p>
      </CardContent>
    </Card>
  )
}
