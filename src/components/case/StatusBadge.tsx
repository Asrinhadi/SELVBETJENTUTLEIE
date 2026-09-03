import {
  BadgeCheck,
  CircleDot,
  CreditCard,
  MessageCircleQuestion,
  ScanLine,
  ThumbsUp,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CASE_STATUS_SHORT, type CaseStatus } from "@/domain/case"

const CONFIG: Record<
  CaseStatus,
  { variant: "info" | "warning" | "success" | "danger" | "secondary"; Icon: typeof CircleDot }
> = {
  mottatt: { variant: "info", Icon: CircleDot },
  automatisk_kontroll: { variant: "info", Icon: ScanLine },
  venter_vurdering: { variant: "warning", Icon: MessageCircleQuestion },
  tilleggsinfo_etterspurt: { variant: "warning", Icon: MessageCircleQuestion },
  godkjent: { variant: "success", Icon: ThumbsUp },
  avslatt: { variant: "danger", Icon: XCircle },
  venter_betaling: { variant: "secondary", Icon: CreditCard },
  bekreftet: { variant: "success", Icon: BadgeCheck },
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { variant, Icon } = CONFIG[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {CASE_STATUS_SHORT[status]}
    </Badge>
  )
}
