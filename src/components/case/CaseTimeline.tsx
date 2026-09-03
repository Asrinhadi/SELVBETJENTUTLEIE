import { Check, CircleDot, XCircle } from "lucide-react"

import {
  CASE_STATUS_LABELS,
  TIMELINE_STEPS,
  type BookingRequest,
  type CaseStatus,
} from "@/domain/case"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

/** Når i historikken saken passerte hvert trinn. */
function reachedAt(request: BookingRequest, status: CaseStatus): string | null {
  const event = request.events.find((e) => e.toStatus === status)
  return event?.timestamp ?? null
}

export function CaseTimeline({ request }: { request: BookingRequest }) {
  const rejected = request.status === "avslatt"
  const steps: readonly CaseStatus[] = rejected
    ? ["mottatt", "automatisk_kontroll", "venter_vurdering", "avslatt"]
    : TIMELINE_STEPS

  const currentIndex = steps.indexOf(request.status)
  // Statuser utenfor hovedløpet (f.eks. venter på søker) regnes som pågående vurdering.
  const activeIndex =
    currentIndex >= 0 ? currentIndex : steps.indexOf("venter_vurdering")

  return (
    <ol className="flex flex-col" aria-label="Status for saken">
      {steps.map((status, index) => {
        const done = index < activeIndex
        const active = index === activeIndex
        const isRejection = status === "avslatt"
        const timestamp = reachedAt(request, status)
        const isLast = index === steps.length - 1

        return (
          <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute top-8 bottom-0 left-[0.9375rem] w-0.5 rounded-full",
                  done ? "bg-primary/50" : "bg-primary/15",
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white/70",
                isRejection && (done || active)
                  ? "bg-danger text-white"
                  : done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-primary-soft text-primary ring-primary/20"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {isRejection && (done || active) ? (
                <XCircle className="size-4" aria-hidden="true" />
              ) : done ? (
                <Check className="size-4" aria-hidden="true" strokeWidth={3} />
              ) : (
                <CircleDot className="size-4" aria-hidden="true" />
              )}
            </span>
            <div className="flex min-w-0 flex-col pt-0.5">
              <span
                className={cn(
                  "text-base",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                  done && "text-foreground",
                )}
              >
                {CASE_STATUS_LABELS[status]}
                {active && (
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-sm font-medium text-primary">
                    Nå
                  </span>
                )}
              </span>
              {timestamp && (
                <time dateTime={timestamp} className="text-sm text-muted-foreground">
                  {formatDateTime(timestamp)}
                </time>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
