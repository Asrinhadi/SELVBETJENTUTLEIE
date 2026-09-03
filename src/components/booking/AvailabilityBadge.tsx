import { CalendarCheck, CalendarClock, CircleHelp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AVAILABILITY_LABELS, type AvailabilityStatus } from "@/domain/rental"

const CONFIG: Record<
  AvailabilityStatus,
  { variant: "success" | "warning" | "info"; Icon: typeof CalendarCheck }
> = {
  likely: { variant: "success", Icon: CalendarCheck },
  conflict: { variant: "warning", Icon: CalendarClock },
  review: { variant: "info", Icon: CircleHelp },
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const { variant, Icon } = CONFIG[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {AVAILABILITY_LABELS[status]}
    </Badge>
  )
}
