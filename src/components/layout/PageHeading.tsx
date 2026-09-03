import type { ReactNode } from "react"

interface PageHeadingProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-2">
        {eyebrow && (
          <p className="text-sm font-semibold tracking-wide text-action uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && (
          <p className="text-lg text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
