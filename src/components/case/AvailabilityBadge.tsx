import { CalendarCheck, CalendarClock, CalendarX, CircleHelp, Clock4 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  AVAILABILITY_LABELS,
  type AvailabilityState,
} from "@/domain/availabilityEngine"

const CONFIG: Record<
  AvailabilityState,
  { variant: "success" | "danger" | "info" | "warning"; Icon: typeof CalendarCheck }
> = {
  ledig: { variant: "success", Icon: CalendarCheck },
  opptatt: { variant: "danger", Icon: CalendarX },
  kan_forespores: { variant: "info", Icon: Clock4 },
  forelopig_reservert: { variant: "warning", Icon: CalendarClock },
  krever_vurdering: { variant: "warning", Icon: CircleHelp },
}

export function AvailabilityBadge({ state }: { state: AvailabilityState }) {
  const { variant, Icon } = CONFIG[state]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {AVAILABILITY_LABELS[state]}
    </Badge>
  )
}
