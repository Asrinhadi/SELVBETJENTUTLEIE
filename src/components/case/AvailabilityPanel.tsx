import { CalendarClock, Info } from "lucide-react"

import { AvailabilityBadge } from "@/components/case/AvailabilityBadge"
import {
  AVAILABILITY_DISCLAIMER,
  type AvailabilitySlot,
} from "@/domain/availabilityEngine"
import { formatMinutes } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface AvailabilityPanelProps {
  slot: AvailabilitySlot
  setupMinutes: number
  cleanupMinutes: number
  className?: string
}

export function AvailabilityPanel({
  slot,
  setupMinutes,
  cleanupMinutes,
  className,
}: AvailabilityPanelProps) {
  const hasBuffer = setupMinutes > 0 || cleanupMinutes > 0

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AvailabilityBadge state={slot.state} />
      </div>

      <p className="text-base">{slot.reason}</p>

      <div className="glass-panel flex flex-col gap-2 p-3.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CalendarClock className="size-4" aria-hidden="true" />
          Slik blokkeres lokalet
        </span>
        <dl className="flex flex-col gap-1 text-base">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Arrangementet</dt>
            <dd className="font-medium tabular-nums">
              {slot.eventFrom}–{slot.eventTo}
            </dd>
          </div>
          {hasBuffer && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Klargjøring og rydding</dt>
              <dd className="font-medium tabular-nums">
                {formatMinutes(setupMinutes)} før, {formatMinutes(cleanupMinutes)} etter
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-primary/10 pt-1">
            <dt className="font-medium">Lokalet er opptatt</dt>
            <dd className="font-semibold text-primary tabular-nums">
              {slot.blockedFrom}–{slot.blockedTo}
            </dd>
          </div>
        </dl>
      </div>

      {slot.conflicts.length > 0 && (
        <div className="glass-panel flex flex-col gap-1.5 border-danger-border bg-danger-soft/60 p-3.5">
          <span className="text-sm font-semibold text-danger">
            Kolliderer med {slot.conflicts.length === 1 ? "en oppføring" : "flere oppføringer"} i kalenderen
          </span>
          <ul className="flex flex-col gap-1">
            {slot.conflicts.map((c) => (
              <li key={c.bookingId} className="text-base">
                {c.title}{" "}
                <span className="text-muted-foreground tabular-nums">({c.timeRange})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {AVAILABILITY_DISCLAIMER}
      </p>
    </div>
  )
}
