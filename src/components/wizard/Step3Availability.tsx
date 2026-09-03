import { AvailabilityPanel } from "@/components/case/AvailabilityPanel"
import { FormField } from "@/components/forms/FormField"
import { VenueImage } from "@/components/venue/VenueImage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { AvailabilitySlot } from "@/domain/availabilityEngine"
import type { EventNeeds } from "@/domain/event"
import { VENUE_TYPE_LABELS, getVenue, type VenueId } from "@/domain/venue"
import { todayIsoDate } from "@/lib/dates"
import { fieldA11y } from "@/lib/fieldA11y"
import { capitalize, formatLongDate } from "@/lib/formatters"

interface Step3Props {
  needs: EventNeeds
  venueId: VenueId
  slot: AvailabilitySlot
  errors: Partial<Record<string, string>>
  onChange: (needs: EventNeeds) => void
}

export function Step3Availability({ needs, venueId, slot, errors, onChange }: Step3Props) {
  const venue = getVenue(venueId)

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Tilgjengelighet for {venue.name}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <div className="flex items-center gap-4">
            <VenueImage type={venue.type} className="hidden h-20 w-28 shrink-0 sm:block" />
            <div className="flex min-w-0 flex-col">
              <span className="text-base font-medium">
                {VENUE_TYPE_LABELS[venue.type]} · {venue.address}
              </span>
              <span className="text-sm text-muted-foreground">
                {capitalize(formatLongDate(needs.date))}
              </span>
            </div>
          </div>

          <AvailabilityPanel
            slot={slot}
            setupMinutes={needs.setupMinutes}
            cleanupMinutes={needs.cleanupMinutes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Juster tidspunktet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-muted-foreground">
            Passer ikke tidspunktet? Endre det her, så oppdateres vurderingen med én gang.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField id="slotDate" label="Dato" error={errors.date}>
              <Input
                type="date"
                min={todayIsoDate()}
                value={needs.date}
                onChange={(e) => onChange({ ...needs, date: e.target.value })}
                {...fieldA11y("slotDate", { error: errors.date })}
              />
            </FormField>
            <FormField id="slotStart" label="Starttid" error={errors.startTime}>
              <Input
                type="time"
                value={needs.startTime}
                onChange={(e) => onChange({ ...needs, startTime: e.target.value })}
                {...fieldA11y("slotStart", { error: errors.startTime })}
              />
            </FormField>
            <FormField id="slotEnd" label="Sluttid" error={errors.endTime}>
              <Input
                type="time"
                value={needs.endTime}
                onChange={(e) => onChange({ ...needs, endTime: e.target.value })}
                {...fieldA11y("slotEnd", { error: errors.endTime })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
