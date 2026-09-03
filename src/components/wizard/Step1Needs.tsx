import type { ReactNode } from "react"
import { CalendarDays, ListChecks, Wrench } from "lucide-react"

import { FormField } from "@/components/forms/FormField"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  EVENT_TYPES,
  getEventType,
  isEventTypeId,
  type EventNeeds,
  type FollowUpId,
} from "@/domain/event"
import { FACILITY_LABELS, type FacilityId } from "@/domain/venue"
import { fieldA11y } from "@/lib/fieldA11y"
import {
  DESCRIPTION_MAX,
  applyEventType,
  type FieldErrors,
} from "@/components/wizard/wizardState"
import { todayIsoDate } from "@/lib/dates"

/** Behovene brukeren kan krysse av for. Rekkefølgen styrer visningen. */
const SELECTABLE_FACILITIES: readonly FacilityId[] = [
  "universell_adkomst",
  "piano",
  "orgel",
  "lydanlegg",
  "projektor",
  "kjokken",
  "scene",
  "teleslynge",
]

const FOLLOW_UP_LABELS: Record<FollowUpId, string> = {
  amplifiedMusic: "Vi bruker forsterket musikk (band, PA eller mikrofoner)",
  ticketed: "Vi selger billetter til arrangementet",
  servingFood: "Vi skal servere mat",
  servingAlcohol: "Vi skal servere alkohol",
  needsStage: "Vi trenger scene eller opphøyd spilleområde",
  publicEvent: "Arrangementet er åpent for publikum",
}

const BUFFER_OPTIONS = [0, 15, 30, 45, 60, 90, 120]

interface Step1Props {
  needs: EventNeeds
  errors: FieldErrors
  onChange: (needs: EventNeeds) => void
}

function SectionCard({
  icon: Icon,
  step,
  title,
  description,
  children,
}: {
  icon: typeof CalendarDays
  step: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary-soft/80 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span
              aria-hidden="true"
              className="font-mono text-xs font-semibold tracking-[0.2em] text-primary/55"
            >
              {step}
            </span>
            <CardTitle className="text-[1.35rem] sm:text-2xl">{title}</CardTitle>
          </div>
        </div>
        <CardDescription className="sm:pl-[3.65rem]">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Step1Needs({ needs, errors, onChange }: Step1Props) {
  const definition = getEventType(needs.eventType)
  const facilitySet = new Set(needs.requiredFacilities)

  function toggleFacility(facility: FacilityId, checked: boolean) {
    const next = new Set(facilitySet)
    if (checked) next.add(facility)
    else next.delete(facility)
    onChange({
      ...needs,
      requiredFacilities: SELECTABLE_FACILITIES.filter((f) => next.has(f)),
    })
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <SectionCard
        icon={ListChecks}
        step="01"
        title="Hva skal skje?"
        description="Fortell oss om behovet ditt, så finner vi lokaler som passer."
      >
        <FormField id="eventType" label="Arrangementstype" error={errors.eventType}>
          <Select
            value={needs.eventType}
            onValueChange={(value) => {
              if (isEventTypeId(value)) onChange(applyEventType(needs, value))
            }}
          >
            <SelectTrigger className="w-full" {...fieldA11y("eventType")}>
              <SelectValue placeholder="Velg arrangementstype" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        </FormField>

        <FormField
          id="description"
          label="Kort beskrivelse"
          error={errors.description}
          hint="Hva skal skje, hvem kommer, og er det noe spesielt vi bør vite?"
        >
          <Textarea
            rows={4}
            maxLength={DESCRIPTION_MAX + 50}
            value={needs.description}
            onChange={(e) => onChange({ ...needs, description: e.target.value })}
            {...fieldA11y("description", {
              error: errors.description,
              hint: "hint",
            })}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {needs.description.length} / {DESCRIPTION_MAX} tegn
          </p>
        </FormField>

        <FormField
          id="expectedAttendees"
          label="Forventet antall personer"
          error={errors.expectedAttendees}
        >
          <Input
            type="number"
            min={1}
            max={2000}
            inputMode="numeric"
            className="max-w-40"
            value={needs.expectedAttendees === 0 ? "" : String(needs.expectedAttendees)}
            onChange={(e) =>
              onChange({ ...needs, expectedAttendees: Number(e.target.value) || 0 })
            }
            {...fieldA11y("expectedAttendees", { error: errors.expectedAttendees })}
          />
        </FormField>

        {definition.followUps.length > 0 && (
          <fieldset className="glass-panel flex flex-col gap-2.5 p-4">
            <legend className="px-1 text-base font-medium">
              Gjelder dette arrangementet?
            </legend>
            {definition.followUps.map((key) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 text-base">
                <Checkbox
                  checked={needs[key] === true}
                  onCheckedChange={(checked) => onChange({ ...needs, [key]: checked === true })}
                  className="mt-0.5"
                />
                {FOLLOW_UP_LABELS[key]}
              </label>
            ))}
          </fieldset>
        )}
      </SectionCard>

      <SectionCard
        icon={CalendarDays}
        step="02"
        title="Når passer det?"
        description="Tid til klargjøring og rydding regnes med når vi sjekker om lokalet er ledig."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id="date" label="Ønsket dato" error={errors.date}>
            <Input
              type="date"
              min={todayIsoDate()}
              value={needs.date}
              onChange={(e) => onChange({ ...needs, date: e.target.value })}
              {...fieldA11y("date", { error: errors.date })}
            />
          </FormField>
          <FormField id="startTime" label="Starttid" error={errors.startTime}>
            <Input
              type="time"
              value={needs.startTime}
              onChange={(e) => onChange({ ...needs, startTime: e.target.value })}
              {...fieldA11y("startTime", { error: errors.startTime })}
            />
          </FormField>
          <FormField id="endTime" label="Sluttid" error={errors.endTime}>
            <Input
              type="time"
              value={needs.endTime}
              onChange={(e) => onChange({ ...needs, endTime: e.target.value })}
              {...fieldA11y("endTime", { error: errors.endTime })}
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="setupMinutes"
            label="Klargjøring før arrangementet"
            required={false}
            hint="Hvor mye tid trenger dere til pynting, oppsett av stoler, teknisk utstyr eller andre forberedelser?"
            error={errors.setupMinutes}
          >
            <Select
              value={String(needs.setupMinutes)}
              onValueChange={(v) => onChange({ ...needs, setupMinutes: Number(v) })}
            >
              <SelectTrigger
                className="w-full"
                {...fieldA11y("setupMinutes", { required: false, hint: "hint" })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 0 ? "Ingen klargjøring" : `${m} minutter`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="cleanupMinutes"
            label="Rydding etter arrangementet"
            required={false}
            hint="Hvor mye tid trenger dere til opprydding, nedpakking av utstyr og å sette lokalet tilbake slik dere fant det?"
            error={errors.cleanupMinutes}
          >
            <Select
              value={String(needs.cleanupMinutes)}
              onValueChange={(v) => onChange({ ...needs, cleanupMinutes: Number(v) })}
            >
              <SelectTrigger
                className="w-full"
                {...fieldA11y("cleanupMinutes", { required: false, hint: "hint" })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m === 0 ? "Ingen rydding" : `${m} minutter`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        icon={Wrench}
        step="03"
        title="Hva trenger dere i lokalet?"
        description="Vi bruker dette til å finne lokaler som dekker behovene."
      >
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">Behov i lokalet</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SELECTABLE_FACILITIES.map((facility) => (
              <label
                key={facility}
                className="glass-panel flex cursor-pointer items-center gap-3 p-3 text-base"
              >
                <Checkbox
                  checked={facilitySet.has(facility)}
                  onCheckedChange={(checked) => toggleFacility(facility, checked === true)}
                />
                {FACILITY_LABELS[facility]}
              </label>
            ))}
          </div>
        </fieldset>

        <FormField
          id="otherNeeds"
          label="Andre behov"
          required={needs.eventType === "annet"}
          error={errors.otherNeeds}
          hint="For eksempel strøm, garderobe, bord og stoler eller parkering."
        >
          <Textarea
            rows={3}
            maxLength={800}
            value={needs.otherNeeds}
            onChange={(e) => onChange({ ...needs, otherNeeds: e.target.value })}
            {...fieldA11y("otherNeeds", {
              error: errors.otherNeeds,
              hint: "hint",
              required: needs.eventType === "annet",
            })}
          />
        </FormField>
      </SectionCard>
    </div>
  )
}
