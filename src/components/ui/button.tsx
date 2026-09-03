import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-base font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        action:
          "bg-action text-action-foreground shadow-sm hover:bg-action-hover focus-visible:ring-action/35",
        outline:
          "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft aria-expanded:bg-primary-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-primary-soft",
        ghost: "text-foreground hover:bg-primary-soft",
        success:
          "border-success-border bg-success-soft text-success hover:bg-success/15 focus-visible:ring-success/30",
        warning:
          "border-warning-border bg-warning-soft text-warning hover:bg-warning/15 focus-visible:ring-warning/30",
        destructive:
          "border-danger-border bg-danger-soft text-danger hover:bg-danger/15 focus-visible:ring-danger/30",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-[0.95rem] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-5 text-lg",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
