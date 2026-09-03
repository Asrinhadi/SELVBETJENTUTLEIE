import { Layers, Layers2, Layers3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { COMPLEXITY_LABELS, type ComplexityLevel } from "@/domain/complexity"

const CONFIG: Record<
  ComplexityLevel,
  { variant: "success" | "info" | "warning"; Icon: typeof Layers }
> = {
  lav: { variant: "success", Icon: Layers },
  middels: { variant: "info", Icon: Layers2 },
  hoy: { variant: "warning", Icon: Layers3 },
}

export function ComplexityBadge({ level }: { level: ComplexityLevel }) {
  const { variant, Icon } = CONFIG[level]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      Kompleksitet: {COMPLEXITY_LABELS[level]}
    </Badge>
  )
}
