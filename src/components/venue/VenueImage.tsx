import type { VenueType } from "@/domain/venue"
import { cn } from "@/lib/utils"

/**
 * Rolige, stiliserte illustrasjoner per lokaletype. Vi bruker tegninger
 * i stedet for stockbilder, slik at prototypen ikke gir inntrykk av å vise
 * faktiske lokaler.
 */
export function VenueImage({
  type,
  className,
}: {
  type: VenueType
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/60 bg-gradient-to-b from-primary-soft to-white",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 90" className="size-full" role="presentation">
        <defs>
          <linearGradient id={`sky-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-soft)" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <rect width="160" height="90" fill={`url(#sky-${type})`} />
        <g
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        >
          {shapeFor(type)}
        </g>
        <line x1="0" y1="78" x2="160" y2="78" stroke="var(--primary)" strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  )
}

function shapeFor(type: VenueType) {
  switch (type) {
    case "kirke":
      return (
        <>
          <path d="M52 78V40l28-18 28 18v38" />
          <path d="M80 22V10" />
          <path d="M74 15h12" />
          <path d="M72 78V60a8 8 0 0 1 16 0v18" />
          <rect x="58" y="46" width="9" height="12" rx="4.5" />
          <rect x="93" y="46" width="9" height="12" rx="4.5" />
        </>
      )
    case "kapell":
      return (
        <>
          <path d="M60 78V46l20-14 20 14v32" />
          <path d="M80 32V22" />
          <path d="M75 26h10" />
          <rect x="72" y="58" width="16" height="20" rx="2" />
        </>
      )
    case "menighetshus":
      return (
        <>
          <path d="M44 78V44l36-16 36 16v34" />
          <rect x="56" y="54" width="14" height="12" rx="2" />
          <rect x="90" y="54" width="14" height="12" rx="2" />
          <rect x="72" y="62" width="16" height="16" rx="2" />
        </>
      )
    case "menighetssal":
      return (
        <>
          <rect x="42" y="42" width="76" height="36" rx="4" />
          <path d="M42 52h76" />
          <rect x="54" y="60" width="12" height="10" rx="2" />
          <rect x="74" y="60" width="12" height="10" rx="2" />
          <rect x="94" y="60" width="12" height="10" rx="2" />
        </>
      )
    case "moterom":
      return (
        <>
          <rect x="52" y="46" width="56" height="32" rx="4" />
          <ellipse cx="80" cy="64" rx="18" ry="6" />
          <path d="M62 56h36" />
        </>
      )
  }
}
