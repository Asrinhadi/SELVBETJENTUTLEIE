import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react"

import { SuitabilityBadge } from "@/components/venue/SuitabilityBadge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import type { SuitabilityReason, SuitabilityResult } from "@/domain/suitabilityEngine"
import { getVenue } from "@/domain/venue"

const REASON_STYLE: Record<
  SuitabilityReason["kind"],
  { Icon: typeof CheckCircle2; className: string; label: string }
> = {
  positiv: { Icon: CheckCircle2, className: "text-success", label: "Oppfylt" },
  advarsel: { Icon: TriangleAlert, className: "text-warning", label: "Merk" },
  mangel: { Icon: CircleAlert, className: "text-danger", label: "Mangel" },
}

interface WhyRecommendedProps {
  result: SuitabilityResult | null
  onOpenChange: (open: boolean) => void
}

export function WhyRecommended({ result, onOpenChange }: WhyRecommendedProps) {
  return (
    <Dialog open={result !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-xl">
        {result && (
          <>
            <DialogHeader>
              <DialogTitle>Hvorfor anbefales {getVenue(result.venueId).name}?</DialogTitle>
              <DialogDescription>
                Vurderingen er regelbasert. Under ser du hver regel som slo ut, og
                hvordan den påvirket resultatet.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SuitabilityBadge verdict={result.verdict} />
                <span className="text-sm text-muted-foreground">
                  Egnethetsscore {result.score} av 100
                </span>
              </div>
              <Progress
                value={result.score}
                className="h-2"
                aria-label={`Egnethetsscore ${result.score} av 100`}
              />
            </div>

            <ul className="flex flex-col gap-2.5">
              {result.reasons.map((reason, index) => {
                const style = REASON_STYLE[reason.kind]
                return (
                  <li
                    key={`${reason.rule}-${index}`}
                    className="surface-solid flex items-start gap-3 p-3"
                  >
                    <style.Icon
                      className={`mt-0.5 size-5 shrink-0 ${style.className}`}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {reason.rule} · {style.label}
                      </span>
                      <span className="text-base">{reason.text}</span>
                      {reason.points < 0 && (
                        <span className="text-sm text-muted-foreground">
                          Trekk: {reason.points} poeng
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {result.requiresManualApproval && (
              <p className="glass-panel flex items-start gap-2 border-warning-border bg-warning-soft/70 p-3 text-sm text-warning">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Denne kombinasjonen krever manuell godkjenning fra saksbehandler.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Reglene og tersklene er fiktive demoregler laget for denne prototypen, og er
              ikke retningslinjene til Sarpsborg kirkelige fellesråd.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
