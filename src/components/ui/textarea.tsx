import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground/80 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
