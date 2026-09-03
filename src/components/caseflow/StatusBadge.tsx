import { CheckCircle2, CircleDot, MessageCircleQuestion, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/domain/rental"

const CONFIG: Record<
  RequestStatus,
  { variant: "info" | "warning" | "success" | "danger"; Icon: typeof CircleDot }
> = {
  new: { variant: "info", Icon: CircleDot },
  needs_info: { variant: "warning", Icon: MessageCircleQuestion },
  approved: { variant: "success", Icon: CheckCircle2 },
  rejected: { variant: "danger", Icon: XCircle },
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { variant, Icon } = CONFIG[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  )
}
