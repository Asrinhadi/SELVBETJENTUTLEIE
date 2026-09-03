import { ArrowRight, CircleAlert, Info, TriangleAlert, Users } from "lucide-react"

import { SuitabilityBadge } from "@/components/venue/SuitabilityBadge"
import { VenueImage } from "@/components/venue/VenueImage"
import { Button } from "@/components/ui/button"
import type { SuitabilityResult } from "@/domain/suitabilityEngine"
import {
  FACILITY_LABELS,
  VENUE_TYPE_LABELS,
  getVenue,
  type VenueId,
} from "@/domain/venue"
import { cn } from "@/lib/utils"

interface VenueCardProps {
  result: SuitabilityResult
  selected: boolean
  onSelect: (venueId: VenueId) => void
  onExplain: (result: SuitabilityResult) => void
}

export function VenueCard({ result, selected, onSelect, onExplain }: VenueCardProps) {
  const venue = getVenue(result.venueId)
  const unsuitable = result.verdict === "ikke_egnet"
  const headline = result.reasons.find((r) => r.kind === "positiv")?.text
  const problem =
    result.missingRequirements[0] ?? result.warnings[0] ?? null

  return (
    <article
      className={cn(
        "glass-card flex flex-col gap-4 p-4 sm:p-5",
        selected && "border-primary/60 bg-white/85 ring-2 ring-primary/25",
        unsuitable && "opacity-75",
      )}
      aria-labelledby={`lokale-${venue.id}`}
    >
      <div className="flex gap-4">
        <VenueImage type={venue.type} className="hidden h-24 w-32 shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <h3 id={`lokale-${venue.id}`} className="text-lg font-semibold">
                {venue.name}
              </h3>
              <span className="text-sm text-muted-foreground">
                {VENUE_TYPE_LABELS[venue.type]} · {venue.address}
              </span>
            </div>
            <SuitabilityBadge verdict={result.verdict} score={result.score} />
          </div>

          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            {venue.seatedCapacity} sitteplasser, maks {venue.maxCapacity} personer
          </p>

          <ul className="flex flex-wrap gap-1.5 pt-0.5">
            {venue.facilities.slice(0, 5).map((f) => (
              <li
                key={f}
                className="rounded-full border border-primary/15 bg-primary-soft/60 px-2 py-0.5 text-sm text-primary"
              >
                {FACILITY_LABELS[f]}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {headline && (
          <p className="flex items-start gap-2 text-base">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {headline}
          </p>
        )}
        {problem && (
          <p
            className={cn(
              "flex items-start gap-2 text-sm",
              unsuitable || result.missingRequirements.length > 0
                ? "text-danger"
                : "text-warning",
            )}
          >
            {result.missingRequirements.length > 0 ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            {problem}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onExplain(result)}>
          Hvorfor anbefales dette?
        </Button>
        <Button
          variant={selected ? "default" : "action"}
          size="sm"
          onClick={() => onSelect(venue.id)}
          disabled={unsuitable}
          aria-pressed={selected}
        >
          {selected ? "Valgt" : "Velg lokalet"}
          {!selected && <ArrowRight aria-hidden="true" />}
        </Button>
      </div>
    </article>
  )
}
