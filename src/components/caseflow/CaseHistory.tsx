import {
  CheckCircle2,
  CircleCheckBig,
  FileCheck,
  ListChecks,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react"

import type { HistoryEvent, HistoryEventType } from "@/domain/rental"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const ICONS: Record<HistoryEventType, { Icon: typeof Send; className: string }> = {
  submitted: { Icon: Send, className: "bg-info-soft text-info" },
  info_requested: { Icon: MessageCircleQuestion, className: "bg-warning-soft text-warning" },
  approved: { Icon: CheckCircle2, className: "bg-success-soft text-success" },
  rejected: { Icon: XCircle, className: "bg-danger-soft text-danger" },
  confirmation_created: { Icon: FileCheck, className: "bg-success-soft text-success" },
  tasks_created: { Icon: ListChecks, className: "bg-primary-soft text-primary" },
  task_completed: { Icon: CircleCheckBig, className: "bg-success-soft text-success" },
  task_reopened: { Icon: RotateCcw, className: "bg-muted text-muted-foreground" },
}

export function CaseHistory({ history }: { history: readonly HistoryEvent[] }) {
  const events = history.slice().reverse()

  return (
    <section aria-labelledby="historikk-tittel" className="flex flex-col gap-4">
      <h3 id="historikk-tittel" className="text-lg font-semibold">
        Sakshistorikk
      </h3>
      <ol className="flex flex-col">
        {events.map((event, index) => {
          const { Icon, className } = ICONS[event.type]
          const isLast = index === events.length - 1
          return (
            <li key={event.id} className="relative flex gap-3 pb-5">
              {!isLast && (
                <span
                  className="absolute top-9 bottom-0 left-4 w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-8 shrink-0 place-items-center rounded-full",
                  className,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                <p className="text-base leading-snug">{event.message}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{event.actor}</span> ·{" "}
                  <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
