import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, formatISO } from "date-fns"
import { toast } from "sonner"

import { BookingForm } from "@/components/booking/BookingForm"
import { SummaryPanel, type SummaryData } from "@/components/booking/SummaryPanel"
import { PageHeading } from "@/components/layout/PageHeading"
import { useRental } from "@/context/useRental"
import { BUILDINGS, PURPOSES } from "@/domain/rental"
import { assessAvailability } from "@/lib/availability"
import {
  bookingSchema,
  parseRevenue,
  toRentalRequestInput,
  type BookingFormValues,
} from "@/lib/bookingSchema"
import { capitalize, formatLongDate, formatTimeRange } from "@/lib/formatters"
import { calculatePrice } from "@/lib/pricing"
import { usePageTitle } from "@/lib/usePageTitle"

const FORM_ID = "booking-form"

function isoDate(date: Date): string {
  return formatISO(date, { representation: "date" })
}

/** Fiktive, forhåndsutfylte kontaktopplysninger for rask testing. */
function buildDefaultValues(today: Date): BookingFormValues {
  return {
    buildingId: "",
    purposeId: "",
    date: isoDate(addDays(today, 14)),
    startTime: "18:00",
    endTime: "21:00",
    estimatedTicketRevenue: "",
    name: "Kari Nordmann",
    organization: "Borg vokalensemble",
    email: "kari.nordmann@example.com",
    phone: "912 34 567",
    description: "",
    confirmRequestOnly: false,
  }
}

export function BookingPage() {
  usePageTitle("Ny forespørsel")
  const navigate = useNavigate()
  const { submitRequest } = useRental()

  const today = useMemo(() => new Date(), [])
  const minDate = isoDate(today)

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: buildDefaultValues(today),
    mode: "onTouched",
  })

  const watched = useWatch({ control: form.control })

  const summary = useMemo<SummaryData>(() => {
    const building = BUILDINGS.find((b) => b.id === watched.buildingId) ?? null
    const purpose = PURPOSES.find((p) => p.id === watched.purposeId) ?? null

    const hasTime = Boolean(watched.date && watched.startTime && watched.endTime)
    const availability = hasTime
      ? assessAvailability({
          date: watched.date ?? "",
          startTime: watched.startTime ?? "",
          endTime: watched.endTime ?? "",
        })
      : null

    const revenue = parseRevenue(watched.estimatedTicketRevenue ?? "")
    const price =
      building && purpose
        ? calculatePrice({
            buildingId: building.id,
            purposeId: purpose.id,
            ...(revenue !== null ? { estimatedTicketRevenue: revenue } : {}),
          })
        : null

    const requiredChecks: boolean[] = [
      Boolean(building),
      Boolean(watched.date),
      Boolean(watched.startTime),
      Boolean(watched.endTime),
      Boolean(purpose),
      Boolean(watched.name?.trim()),
      Boolean(watched.email?.trim()),
      Boolean(watched.phone?.trim()),
      Boolean(watched.description?.trim()),
      watched.confirmRequestOnly === true,
    ]
    if (purpose?.id === "concert_ticketed") {
      requiredChecks.push(revenue !== null && revenue > 0)
    }

    return {
      buildingName: building?.name ?? null,
      dateLabel: watched.date ? capitalize(formatLongDate(watched.date)) : null,
      timeLabel:
        watched.startTime && watched.endTime
          ? formatTimeRange(watched.startTime, watched.endTime)
          : null,
      purposeLabel: purpose?.label ?? null,
      availability,
      price,
      completedFields: requiredChecks.filter(Boolean).length,
      totalFields: requiredChecks.length,
    }
  }, [watched])

  function handleSubmit(values: BookingFormValues) {
    const request = submitRequest(toRentalRequestInput(values))
    toast.success(`Forespørsel ${request.reference} er registrert`, {
      description: "Saken ligger nå øverst i den interne innboksen.",
    })
    navigate(`/bekreftelse/${request.id}`)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeading
        eyebrow="Offentlig forespørsel"
        title="Send forespørsel om leie av kirke eller menighetslokale"
        description="Fyll inn skjemaet, så får du en foreløpig pris og en indikasjon på om lokalet er ledig. Saksbehandler bekrefter endelig ledighet og pris."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <BookingForm
          form={form}
          formId={FORM_ID}
          minDate={minDate}
          onSubmit={handleSubmit}
        />
        <aside className="lg:sticky lg:top-6" aria-label="Oppsummering av forespørselen">
          <SummaryPanel
            data={summary}
            formId={FORM_ID}
            isSubmitting={form.formState.isSubmitting}
          />
        </aside>
      </div>
    </div>
  )
}
