import { Controller, type UseFormReturn } from "react-hook-form"
import { Building2, CalendarDays, Info, Megaphone, UserRound } from "lucide-react"

import { FormField } from "@/components/booking/FormField"
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
import { BUILDINGS, PURPOSES } from "@/domain/rental"
import {
  DESCRIPTION_MAX,
  EMAIL_MAX,
  NAME_MAX,
  ORGANIZATION_MAX,
  PHONE_MAX,
  type BookingFormValues,
} from "@/lib/bookingSchema"
import { fieldA11y } from "@/lib/fieldA11y"
import { cn } from "@/lib/utils"

const REVENUE_HINT =
  "Leien beregnes som 15 % av billettinntektene, med minimumsbeløp per prisgruppe."

/** Litt slingringsmonn over grensen slik at brukeren ser feilmeldingen i stedet for å bli stoppet stille. */
const DESCRIPTION_HARD_LIMIT = DESCRIPTION_MAX + 50

interface BookingFormProps {
  form: UseFormReturn<BookingFormValues>
  formId: string
  minDate: string
  maxDate: string
  onSubmit: (values: BookingFormValues) => void
}

function SectionTitle({
  step,
  icon: Icon,
  title,
  description,
}: {
  /** Visuelt trinnnummer («01»). Skjult for skjermlesere – overskriften bærer meningen. */
  step: string
  icon: typeof Building2
  title: string
  description?: string
}) {
  return (
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
      {description && <CardDescription className="sm:pl-[3.65rem]">{description}</CardDescription>}
    </CardHeader>
  )
}

export function BookingForm({ form, formId, minDate, maxDate, onSubmit }: BookingFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form

  const purposeId = watch("purposeId")
  const description = watch("description")
  const showRevenue = purposeId === "concert_ticketed"

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 sm:gap-6"
      aria-describedby="skjema-intro"
    >
      <p id="skjema-intro" className="sr-only">
        Felt merket med stjerne er obligatoriske.
      </p>

      <Card>
        <SectionTitle
          step="01"
          icon={Building2}
          title="Lokale og tidspunkt"
          description="Velg hvilket bygg du ønsker, og når arrangementet skal være."
        />
        <CardContent>
          <FormField
            id="buildingId"
            label="Bygg"
            error={errors.buildingId?.message}
          >
            <Controller
              control={control}
              name="buildingId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  name={field.name}
                >
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full"
                    {...fieldA11y("buildingId", { error: errors.buildingId?.message })}
                  >
                    <SelectValue placeholder="Velg bygg" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDINGS.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                        <span className="ml-1 text-sm text-muted-foreground">
                          · prisgruppe {building.priceGroup}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-3">
            <FormField id="date" label="Dato" error={errors.date?.message}>
              <Input
                type="date"
                min={minDate}
                max={maxDate}
                {...register("date")}
                {...fieldA11y("date", { error: errors.date?.message })}
              />
            </FormField>
            <FormField id="startTime" label="Starttid" error={errors.startTime?.message}>
              <Input
                type="time"
                {...register("startTime")}
                {...fieldA11y("startTime", { error: errors.startTime?.message })}
              />
            </FormField>
            <FormField id="endTime" label="Sluttid" error={errors.endTime?.message}>
              <Input
                type="time"
                {...register("endTime")}
                {...fieldA11y("endTime", { error: errors.endTime?.message })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle
          step="02"
          icon={Megaphone}
          title="Formål"
          description="Formålet bestemmer hvilken sats som gjelder."
        />
        <CardContent>
          <FormField id="purposeId" label="Formål" error={errors.purposeId?.message}>
            <Controller
              control={control}
              name="purposeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  name={field.name}
                >
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full"
                    {...fieldA11y("purposeId", { error: errors.purposeId?.message })}
                  >
                    <SelectValue placeholder="Velg formål" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((purpose) => (
                      <SelectItem key={purpose.id} value={purpose.id}>
                        {purpose.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {showRevenue && (
            <FormField
              id="estimatedTicketRevenue"
              label="Estimert billettinntekt (kr)"
              hint={REVENUE_HINT}
              error={errors.estimatedTicketRevenue?.message}
            >
              <Input
                inputMode="numeric"
                placeholder="f.eks. 40 000"
                maxLength={21}
                {...register("estimatedTicketRevenue")}
                {...fieldA11y("estimatedTicketRevenue", {
                  error: errors.estimatedTicketRevenue?.message,
                  hint: REVENUE_HINT,
                })}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <Card>
        <SectionTitle
          step="03"
          icon={UserRound}
          title="Kontaktopplysninger"
          description="Vi bruker opplysningene kun til å følge opp forespørselen."
        />
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="name" label="Navn" error={errors.name?.message}>
              <Input
                autoComplete="name"
                maxLength={NAME_MAX}
                {...register("name")}
                {...fieldA11y("name", { error: errors.name?.message })}
              />
            </FormField>
            <FormField
              id="organization"
              label="Forening eller virksomhet"
              required={false}
              error={errors.organization?.message}
            >
              <Input
                autoComplete="organization"
                maxLength={ORGANIZATION_MAX}
                {...register("organization")}
                {...fieldA11y("organization", {
                  error: errors.organization?.message,
                  required: false,
                })}
              />
            </FormField>
            <FormField id="email" label="E-post" error={errors.email?.message}>
              <Input
                type="email"
                autoComplete="email"
                maxLength={EMAIL_MAX}
                {...register("email")}
                {...fieldA11y("email", { error: errors.email?.message })}
              />
            </FormField>
            <FormField id="phone" label="Telefon" error={errors.phone?.message}>
              <Input
                type="tel"
                autoComplete="tel"
                maxLength={PHONE_MAX}
                {...register("phone")}
                {...fieldA11y("phone", { error: errors.phone?.message })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle
          step="04"
          icon={CalendarDays}
          title="Om arrangementet"
          description="Fortell kort hva som skal skje, hvor mange som kommer og om dere trenger utstyr."
        />
        <CardContent>
          <FormField
            id="description"
            label="Beskrivelse av arrangementet"
            error={errors.description?.message}
          >
            <Textarea
              rows={5}
              maxLength={DESCRIPTION_HARD_LIMIT}
              {...register("description")}
              {...fieldA11y("description", { error: errors.description?.message })}
            />
            <p
              className={cn(
                "text-sm text-muted-foreground",
                description.length > DESCRIPTION_MAX && "font-medium text-danger",
              )}
              aria-live="polite"
            >
              {description.length} / {DESCRIPTION_MAX} tegn
            </p>
          </FormField>

          <div className="glass-panel flex flex-col gap-2 p-4">
            <Controller
              control={control}
              name="confirmRequestOnly"
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="confirmRequestOnly"
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                    aria-invalid={errors.confirmRequestOnly ? true : undefined}
                    aria-describedby={
                      errors.confirmRequestOnly
                        ? "confirmRequestOnly-error"
                        : "confirmRequestOnly-hint"
                    }
                    className="mt-0.5"
                  />
                  <label htmlFor="confirmRequestOnly" className="cursor-pointer text-base leading-snug">
                    Jeg forstår at dette bare er en forespørsel, og at lokalet
                    ikke er reservert før jeg får bekreftelse fra saksbehandler.
                    <span className="text-action" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  </label>
                </div>
              )}
            />
            <p id="confirmRequestOnly-hint" className="flex items-start gap-1.5 pl-9 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Saksbehandler svarer normalt innen tre virkedager.
            </p>
            {errors.confirmRequestOnly && (
              <p
                id="confirmRequestOnly-error"
                role="alert"
                className="pl-9 text-sm font-medium text-danger"
              >
                {errors.confirmRequestOnly.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
