import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const toasterStyle: CSSProperties = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
  "--success-bg": "var(--success-soft)",
  "--success-text": "var(--success)",
  "--success-border": "var(--success-border)",
  "--warning-bg": "var(--warning-soft)",
  "--warning-text": "var(--warning)",
  "--warning-border": "var(--warning-border)",
  "--error-bg": "var(--danger-soft)",
  "--error-text": "var(--danger)",
  "--error-border": "var(--danger-border)",
  "--info-bg": "var(--info-soft)",
  "--info-text": "var(--info)",
  "--info-border": "var(--info-border)",
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="top-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      style={toasterStyle}
      toastOptions={{
        closeButtonAriaLabel: "Lukk varsling",
        classNames: {
          toast: "text-base! font-sans!",
          title: "text-base! font-medium!",
          description: "text-sm!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
