import type { ReactNode } from "react"
import { CircleAlert } from "lucide-react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

export function FormField({
  id,
  label,
  required = true,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-action" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-sm font-normal text-muted-foreground">
            (valgfritt)
          </span>
        )}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm font-medium text-danger"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
