import { CheckCircle2, CircleDashed, CircleHelp, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  VERDICT_LABELS,
  type SuitabilityVerdict,
} from "@/domain/suitabilityEngine"

const CONFIG: Record<
  SuitabilityVerdict,
  { variant: "success" | "info" | "warning" | "danger"; Icon: typeof CheckCircle2 }
> = {
  god_match: { variant: "success", Icon: CheckCircle2 },
  mulig: { variant: "info", Icon: CircleDashed },
  ma_vurderes: { variant: "warning", Icon: CircleHelp },
  ikke_egnet: { variant: "danger", Icon: XCircle },
}

export function SuitabilityBadge({
  verdict,
  score,
}: {
  verdict: SuitabilityVerdict
  score?: number
}) {
  const { variant, Icon } = CONFIG[verdict]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {VERDICT_LABELS[verdict]}
      {score !== undefined && (
        <span className="font-normal opacity-75">· {score}/100</span>
      )}
    </Badge>
  )
}
