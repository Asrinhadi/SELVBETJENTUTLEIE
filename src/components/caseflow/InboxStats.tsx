import { ClipboardList, Inbox, MessageCircleQuestion } from "lucide-react"

import type { InboxStats as Stats } from "@/context/rentalContextValue"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number
  icon: typeof Inbox
  tone: "info" | "warning" | "primary"
}

const TONE_CLASS: Record<StatCardProps["tone"], string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  primary: "bg-primary-soft text-primary",
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-[1.25rem] p-4">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
          TONE_CLASS[tone],
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="text-3xl leading-none font-semibold tracking-[-0.02em] text-foreground">
          {value}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export function InboxStats({ stats }: { stats: Stats }) {
  return (
    <section aria-label="Nøkkeltall" className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Nye saker" value={stats.newCount} icon={Inbox} tone="info" />
      <StatCard
        label="Venter på svar fra søker"
        value={stats.waitingCount}
        icon={MessageCircleQuestion}
        tone="warning"
      />
      <StatCard
        label="Åpne oppgaver"
        value={stats.openTaskCount}
        icon={ClipboardList}
        tone="primary"
      />
    </section>
  )
}
