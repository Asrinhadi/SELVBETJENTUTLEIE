import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-base text-foreground shadow-[inset_0_1px_2px_rgba(22,48,47,0.06)] transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/75 hover:border-primary/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
