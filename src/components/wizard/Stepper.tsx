import { Check } from "lucide-react"

import { WIZARD_STEPS } from "@/components/wizard/wizardState"
import { cn } from "@/lib/utils"

interface StepperProps {
  current: number
  furthest: number
  onNavigate: (step: number) => void
}

export function Stepper({ current, furthest, onNavigate }: StepperProps) {
  return (
    <nav aria-label="Fremdrift" className="glass-card p-3 sm:p-4">
      <ol className="flex items-center gap-1 sm:gap-2">
        {WIZARD_STEPS.map((step, index) => {
          const done = step.id < current
          const active = step.id === current
          const reachable = step.id <= furthest
          const isLast = index === WIZARD_STEPS.length - 1

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => reachable && onNavigate(step.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors duration-200 outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:px-2.5",
                  reachable ? "cursor-pointer hover:bg-primary-soft/60" : "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgba(12,49,46,0.7)]"
                      : done
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden="true" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-sm font-medium sm:text-base",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span className="sm:hidden">{step.short}</span>
                    <span className="hidden sm:inline">{step.title}</span>
                  </span>
                  <span className="sr-only">
                    {done ? "fullført" : active ? "aktivt steg" : "ikke startet"}
                  </span>
                </span>
              </button>
              {!isLast && (
                <span
                  className={cn(
                    "hidden h-0.5 w-4 shrink-0 rounded-full sm:block",
                    done ? "bg-primary/50" : "bg-primary/15",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
