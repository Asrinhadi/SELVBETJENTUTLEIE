import type { ReactNode } from "react"
import { TriangleAlert, UserRound, Wand2 } from "lucide-react"

import { AvailabilityBadge } from "@/components/case/AvailabilityBadge"
import { SuitabilityBadge } from "@/components/venue/SuitabilityBadge"
import { FormField } from "@/components/forms/FormField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { AvailabilitySlot } from "@/domain/availabilityEngine"
import type { Applicant } from "@/domain/case"
import { getEventType, type EventNeeds } from "@/domain/event"
import type { PriceEstimate } from "@/domain/pricingEngine"
import type { SuitabilityResult } from "@/domain/suitabilityEngine"
import { FACILITY_LABELS, getVenue, type VenueId } from "@/domain/venue"
import { fieldA11y } from "@/lib/fieldA11y"
import { capitalize, formatCurrency, formatLongDate, formatMinutes } from "@/lib/formatters"
import { DEMO_APPLICANT, type FieldErrors } from "@/components/wizard/wizardState"

/**
 * Autofyll er slått av på kontaktfeltene.
 *
 * Nettleserens autofyll og passordbehandlere griper inn i felt med
 * `autocomplete="email"` og `"tel"`: de kan tømme eller overskrive feltet
 * uten å utløse en React-hendelse. Da viser skjemaet noe annet enn det
 * appen faktisk lagrer – nøyaktig den typen avvik som ikke kan forekomme i
 * et saksbehandlingssystem. Demoen ber dessuten uttrykkelig om at man IKKE
 * skriver inn ekte personopplysninger, så autofyll er uønsket uansett.
 */
const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
} as const

interface Step5Props {
  needs: EventNeeds
  venueId: VenueId
  applicant: Applicant
  suitability: SuitabilityResult
  slot: AvailabilitySlot
  estimate: PriceEstimate
  errors: FieldErrors
  onChange: (applicant: Applicant) => void
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:max-w-[60%] sm:text-right">{value}</dd>
    </div>
  )
}

export function Step5Submit({
  needs,
  venueId,
  applicant,
  suitability,
  slot,
  estimate,
  errors,
  onChange,
}: Step5Props) {
  const venue = getVenue(venueId)

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary-soft/80 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <CardTitle className="text-[1.35rem] sm:text-2xl">Kontaktopplysninger</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="glass-panel flex flex-col gap-3 border-warning-border bg-warning-soft/70 p-3.5">
            <p className="flex items-start gap-2 text-base text-warning">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <strong>Ikke skriv inn ekte personopplysninger i demoen.</strong> Ingenting
                sendes ut av nettleseren, men bruk likevel oppdiktede opplysninger.
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => onChange({ ...DEMO_APPLICANT })}
            >
              <Wand2 aria-hidden="true" />
              Fyll inn fiktive testopplysninger
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="name" label="Navn" error={errors.name}>
              <Input
                {...NO_AUTOFILL}
                name="kf-navn"
                maxLength={100}
                value={applicant.name}
                onChange={(e) => onChange({ ...applicant, name: e.target.value })}
                {...fieldA11y("name", { error: errors.name })}
              />
            </FormField>
            <FormField
              id="organization"
              label="Forening eller virksomhet"
              required={false}
              error={errors.organization}
            >
              <Input
                {...NO_AUTOFILL}
                name="kf-virksomhet"
                maxLength={120}
                value={applicant.organization ?? ""}
                onChange={(e) => onChange({ ...applicant, organization: e.target.value })}
                {...fieldA11y("organization", {
                  error: errors.organization,
                  required: false,
                })}
              />
            </FormField>
            <FormField id="email" label="E-post" error={errors.email}>
              <Input
                {...NO_AUTOFILL}
                type="email"
                name="kf-epost"
                maxLength={254}
                value={applicant.email}
                onChange={(e) => onChange({ ...applicant, email: e.target.value })}
                {...fieldA11y("email", { error: errors.email })}
              />
            </FormField>
            <FormField id="phone" label="Telefon" error={errors.phone}>
              <Input
                {...NO_AUTOFILL}
                type="tel"
                name="kf-telefon"
                maxLength={20}
                value={applicant.phone}
                onChange={(e) => onChange({ ...applicant, phone: e.target.value })}
                {...fieldA11y("phone", { error: errors.phone })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontroller forespørselen</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col divide-y divide-primary/10">
            <Row label="Arrangement" value={getEventType(needs.eventType).label} />
            <Row label="Antall personer" value={`${needs.expectedAttendees} personer`} />
            <Row label="Lokale" value={venue.name} />
            <Row label="Dato" value={capitalize(formatLongDate(needs.date))} />
            <Row
              label="Tidspunkt"
              value={`kl. ${needs.startTime}–${needs.endTime}`}
            />
            <Row
              label="Klargjøring og rydding"
              value={`${formatMinutes(needs.setupMinutes)} før, ${formatMinutes(needs.cleanupMinutes)} etter`}
            />
            <Row
              label="Lokalet blokkeres"
              value={`kl. ${slot.blockedFrom}–${slot.blockedTo}`}
            />
            {needs.requiredFacilities.length > 0 && (
              <Row
                label="Behov"
                value={needs.requiredFacilities.map((f) => FACILITY_LABELS[f]).join(", ")}
              />
            )}
          </dl>

          <Separator className="bg-primary/10" />

          <dl className="flex flex-col divide-y divide-primary/10">
            <Row label="Egnethet" value={<SuitabilityBadge verdict={suitability.verdict} />} />
            <Row label="Tilgjengelighet" value={<AvailabilityBadge state={slot.state} />} />
            <Row
              label="Foreløpig pris"
              value={
                <span className="text-lg text-primary">{formatCurrency(estimate.total)}</span>
              }
            />
          </dl>

          <p className="glass-panel border-cream-border/80 bg-cream-soft/70 p-3 text-sm text-muted-foreground">
            Når du sender inn, opprettes en sak som en saksbehandler behandler manuelt.
            Lokalet er ikke reservert før du får bekreftelse.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
