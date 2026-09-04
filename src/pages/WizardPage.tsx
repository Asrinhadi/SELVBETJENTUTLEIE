import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Send } from "lucide-react"
import { toast } from "sonner"

import { PageHeading } from "@/components/layout/PageHeading"
import { Stepper } from "@/components/wizard/Stepper"
import { Step1Needs } from "@/components/wizard/Step1Needs"
import { Step2Venues } from "@/components/wizard/Step2Venues"
import { Step3Availability } from "@/components/wizard/Step3Availability"
import { Step4Price } from "@/components/wizard/Step4Price"
import { Step5Submit } from "@/components/wizard/Step5Submit"
import {
  WIZARD_STEPS,
  buildInitialWizardData,
  focusFirstError,
  hasErrors,
  validateStep1,
  validateStep5,
  type FieldErrors,
  type WizardData,
} from "@/components/wizard/wizardState"
import { Button } from "@/components/ui/button"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import { assessAvailability } from "@/domain/availabilityEngine"
import { calculatePrice } from "@/domain/pricingEngine"
import { evaluateVenue } from "@/domain/suitabilityEngine"
import { getVenue } from "@/domain/venue"
import { usePageTitle } from "@/lib/usePageTitle"

const LAST_STEP = WIZARD_STEPS.length

export function WizardPage() {
  usePageTitle("Ny forespørsel")
  const navigate = useNavigate()
  const { state, submitCase } = useKirkeFlow()

  const [step, setStep] = useState(1)
  const [furthest, setFurthest] = useState(1)
  const [data, setData] = useState<WizardData>(() => buildInitialWizardData())
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const { needs, venueId, applicant } = data

  const suitability = useMemo(
    () => (venueId ? evaluateVenue(needs, getVenue(venueId)) : null),
    [needs, venueId],
  )
  const slot = useMemo(
    () => (venueId ? assessAvailability(needs, venueId, state.calendar) : null),
    [needs, venueId, state.calendar],
  )
  const estimate = useMemo(
    () => (venueId ? calculatePrice(needs, venueId) : null),
    [needs, venueId],
  )

  function goTo(next: number) {
    setStep(next)
    setFurthest((f) => Math.max(f, next))
    setErrors({})
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function reportErrors(found: FieldErrors, idMap: Record<string, string> = {}) {
    setErrors(found)
    toast.error("Noen felt må rettes", {
      description: "Vi har flyttet deg til det første feltet som mangler noe.",
    })
    // Fokus settes etter at feilmeldingene er malt, ellers finnes ikke feltet ennå.
    window.setTimeout(() => focusFirstError(found, idMap), 0)
  }

  function handleNext() {
    if (step === 1) {
      const found = validateStep1(needs)
      if (hasErrors(found)) {
        reportErrors(found)
        return
      }
      setErrors({})
      goTo(2)
      return
    }

    if (step === 2) {
      if (!venueId) {
        toast.error("Velg et lokale", {
          description: "Du må velge et lokale før du kan gå videre.",
        })
        return
      }
      goTo(3)
      return
    }

    if (step === 3) {
      const found = validateStep1(needs)
      const relevant: FieldErrors = {
        ...(found.date ? { date: found.date } : {}),
        ...(found.startTime ? { startTime: found.startTime } : {}),
        ...(found.endTime ? { endTime: found.endTime } : {}),
      }
      if (hasErrors(relevant)) {
        reportErrors(relevant, {
          date: "slotDate",
          startTime: "slotStart",
          endTime: "slotEnd",
        })
        return
      }
      setErrors({})
      goTo(4)
      return
    }

    if (step === 4) {
      goTo(5)
      return
    }

    handleSubmit()
  }

  function handleSubmit() {
    if (!venueId) return
    const found = validateStep5(applicant)
    if (hasErrors(found)) {
      reportErrors(found)
      return
    }
    setErrors({})

    setSubmitting(true)
    const organization = (applicant.organization ?? "").trim()
    const request = submitCase({
      needs,
      venueId,
      applicant: {
        name: applicant.name.trim(),
        email: applicant.email.trim(),
        phone: applicant.phone.trim(),
        ...(organization.length > 0 ? { organization } : {}),
      },
    })
    toast.success(`Forespørsel ${request.caseNumber} er registrert`, {
      description: "Saken ligger nå i den interne innboksen.",
    })
    navigate(`/sak/${request.id}`)
  }

  const canGoBack = step > 1

  return (
    <div className="animate-fade mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeading
        eyebrow="KirkeFlow"
        title="Finn lokale, få pris, følg saken"
        description="Beskriv arrangementet ditt, så foreslår vi lokaler som passer, viser et forklart prisoverslag og oppretter en sak du kan følge."
      />

      <Stepper current={step} furthest={furthest} onNavigate={goTo} />

      {step === 1 && (
        <Step1Needs
          needs={needs}
          errors={errors}
          onChange={(next) => setData({ ...data, needs: next })}
        />
      )}

      {step === 2 && (
        <Step2Venues
          needs={needs}
          selectedVenueId={venueId}
          onSelect={(id) => {
            setData({ ...data, venueId: id })
            goTo(3)
          }}
        />
      )}

      {step === 3 && venueId && slot && (
        <Step3Availability
          needs={needs}
          venueId={venueId}
          slot={slot}
          errors={errors}
          onChange={(next) => setData({ ...data, needs: next })}
          onChangeVenue={() => goTo(2)}
        />
      )}

      {step === 4 && venueId && estimate && (
        <Step4Price estimate={estimate} venueId={venueId} />
      )}

      {step === 5 && venueId && slot && estimate && suitability && (
        <Step5Submit
          needs={needs}
          venueId={venueId}
          applicant={applicant}
          suitability={suitability}
          slot={slot}
          estimate={estimate}
          errors={errors}
          onChange={(next) => setData({ ...data, applicant: next })}
        />
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Button
          variant="outline"
          onClick={() => canGoBack && goTo(step - 1)}
          disabled={!canGoBack}
        >
          <ArrowLeft aria-hidden="true" />
          Tilbake
        </Button>
        <span className="text-sm text-muted-foreground">
          Steg {step} av {LAST_STEP}
        </span>
        <Button variant="action" onClick={handleNext} disabled={submitting}>
          {step === LAST_STEP ? (
            <>
              <Send aria-hidden="true" />
              {submitting ? "Sender …" : "Send forespørsel"}
            </>
          ) : (
            <>
              Neste
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
