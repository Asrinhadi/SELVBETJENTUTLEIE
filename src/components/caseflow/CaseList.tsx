import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, ChevronRight, MapPin, Search } from "lucide-react"

import { StatusBadge } from "@/components/caseflow/StatusBadge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getBuilding,
  getPurpose,
  type RentalRequest,
  type RequestStatus,
} from "@/domain/rental"
import { formatShortDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type Filter = "all" | RequestStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "new", label: "Nye" },
  { value: "needs_info", label: "Venter" },
  { value: "approved", label: "Godkjent" },
  { value: "rejected", label: "Avslått" },
]

function isFilter(value: string): value is Filter {
  return FILTERS.some((f) => f.value === value)
}

interface CaseListProps {
  requests: readonly RentalRequest[]
  selectedId: string | null
}

export function CaseList({ requests, selectedId }: CaseListProps) {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return requests.filter((request) => {
      if (filter !== "all" && request.status !== filter) return false
      if (normalized.length === 0) return true
      const haystack = [
        request.reference,
        request.applicant.name,
        request.applicant.organization ?? "",
        getBuilding(request.buildingId).name,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [requests, filter, query])

  return (
    <section aria-labelledby="saksliste-tittel" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 id="saksliste-tittel" className="text-xl font-semibold">
          Forespørsler
          <span className="ml-2 text-base font-normal tracking-normal text-muted-foreground">
            ({visible.length} av {requests.length})
          </span>
        </h2>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søk på referanse, navn eller bygg"
            aria-label="Søk i forespørsler"
            className="pl-10"
          />
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => {
            if (isFilter(value)) setFilter(value)
          }}
        >
          <TabsList
            aria-label="Filtrer på status"
            className="glass-panel w-full flex-wrap gap-1 rounded-xl bg-white/55 p-1 group-data-horizontal/tabs:h-auto"
          >
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-9 rounded-lg px-3 text-sm text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/25 data-active:bg-white data-active:text-primary data-active:shadow-[0_6px_16px_-8px_rgba(12,49,46,0.45)] sm:text-base"
              >
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <p className="glass-panel border-dashed border-primary/25 p-6 text-center text-muted-foreground">
          Ingen saker samsvarer med filteret.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((request) => {
            const isSelected = request.id === selectedId
            return (
              <li key={request.id}>
                <Link
                  to={`/admin/saker/${request.id}`}
                  aria-current={isSelected ? "page" : undefined}
                  className={cn(
                    // Nivå 3: tekstrik liste – ugjennomsiktig for lesbarhet og for å
                    // unngå mange blur-lag oppå hverandre.
                    "surface-solid group flex items-start gap-3 p-4 outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
                    isSelected
                      ? "border-l-4 border-primary/45 border-l-primary bg-white pl-[calc(1rem-3px)] shadow-[0_10px_28px_-18px_rgba(12,49,46,0.5)]"
                      : "hover:border-primary/35 hover:bg-white hover:shadow-[0_10px_24px_-18px_rgba(12,49,46,0.45)]",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {request.reference}
                      </span>
                      <StatusBadge status={request.status} />
                    </div>
                    <span className="truncate text-base font-medium">
                      {request.applicant.name}
                      {request.applicant.organization && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {request.applicant.organization}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {getPurpose(request.purposeId).label}
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-4" aria-hidden="true" />
                        {getBuilding(request.buildingId).name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        {formatShortDate(request.date)} kl. {request.startTime}–{request.endTime}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
