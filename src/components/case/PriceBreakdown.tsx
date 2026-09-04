import { Info } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import {
  PRICE_DISCLAIMER,
  PRICE_LINE_GROUP_LABELS,
  type PriceEstimate,
} from "@/domain/pricingEngine"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export function PriceBreakdown({
  estimate,
  className,
}: {
  estimate: PriceEstimate
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col">
        {estimate.lines.map((line, index) => (
          <li
            key={line.id}
            className={cn(
              "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5",
              index > 0 && "border-t border-primary/10",
            )}
          >
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {PRICE_LINE_GROUP_LABELS[line.kind]}
              </span>
              <span className="text-base font-medium">{line.label}</span>
              <span className="text-sm text-muted-foreground">{line.detail}</span>
            </div>
            <span
              className={cn(
                "shrink-0 text-base font-semibold tabular-nums",
                line.amount < 0 ? "text-success" : "text-foreground",
              )}
            >
              {formatCurrency(line.amount)}
            </span>
          </li>
        ))}
      </ul>

      <Separator className="bg-primary/15" />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-semibold">Foreløpig totalsum</span>
        <span className="text-3xl font-semibold tracking-[-0.02em] text-primary tabular-nums">
          {formatCurrency(estimate.total)}
        </span>
      </div>

      {estimate.notes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {estimate.notes.map((note) => (
            <li key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {note}
            </li>
          ))}
        </ul>
      )}

      <p className="glass-panel border-cream-border/80 bg-cream-soft/70 p-3 text-sm text-muted-foreground">
        {PRICE_DISCLAIMER} Satsene er fiktive demopriser.
      </p>
    </div>
  )
}
