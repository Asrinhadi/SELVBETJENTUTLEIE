import { CheckCircle2, CircleDashed, CircleHelp, Star, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  BEST_MATCH_LABEL,
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
  isBest = false,
}: {
  verdict: SuitabilityVerdict
  /** Merker det høyest rangerte lokalet, slik at listen har en tydelig vinner. */
  isBest?: boolean
}) {
  if (isBest) {
    return (
      <Badge variant="success" className="border-success/40 bg-success text-white">
        <Star aria-hidden="true" />
        {BEST_MATCH_LABEL}
      </Badge>
    )
  }

  const { variant, Icon } = CONFIG[verdict]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {VERDICT_LABELS[verdict]}
    </Badge>
  )
}
