import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  CalendarX,
  CircleAlert,
  Inbox,
  MessageCircleQuestion,
  Search,
  UserX,
} from "lucide-react"

import { ComplexityBadge } from "@/components/case/ComplexityBadge"
import { StatusBadge } from "@/components/case/StatusBadge"
import { PageHeading } from "@/components/layout/PageHeading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import { CASE_STATUSES, CASE_STATUS_SHORT, type CaseStatus } from "@/domain/case"
import { COMPLEXITY_LABELS, type ComplexityLevel } from "@/domain/complexity"
import { getEventType } from "@/domain/event"
import { VENUES, getVenue } from "@/domain/venue"
import { STAFF, staffName } from "@/data/staff"
import { formatDateTime, formatShortDate } from "@/lib/formatters"
import { usePageTitle } from "@/lib/usePageTitle"
import { cn } from "@/lib/utils"

const ANY = "alle"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Inbox
  tone: "info" | "warning" | "primary" | "danger"
}) {
  const toneClass = {
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    primary: "bg-primary-soft text-primary",
    danger: "bg-danger-soft text-danger",
  }[tone]

  return (
    <div className="glass-card flex items-center gap-3 rounded-[1.25rem] p-3.5">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
          toneClass,
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-2xl leading-none font-semibold tracking-[-0.02em]">{value}</span>
        <span className="mt-1 text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export function AdminInboxPage() {
  usePageTitle("Saksbehandling")
  const { state, stats } = useKirkeFlow()

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>(ANY)
  const [venue, setVenue] = useState<string>(ANY)
  const [assignee, setAssignee] = useState<string>(ANY)
  const [complexity, setComplexity] = useState<string>(ANY)
  const [fromDate, setFromDate] = useState("")
  const [onlyConflicts, setOnlyConflicts] = useState(false)
  const [onlyMissing, setOnlyMissing] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.cases.filter((c) => {
      if (status !== ANY && c.status !== status) return false
      if (venue !== ANY && c.venueId !== venue) return false
      if (assignee !== ANY) {
        if (assignee === "ingen" ? c.assignedTo !== null : c.assignedTo !== assignee) return false
      }
      if (complexity !== ANY && c.complexity.level !== complexity) return false
      if (fromDate && c.needs.date < fromDate) return false
      if (onlyConflicts && c.availability.conflicts.length === 0) return false
      if (onlyMissing && c.missingInfo.length === 0) return false
      if (q.length > 0) {
        const haystack = [
          c.caseNumber,
          c.applicant.name,
          c.applicant.organization ?? "",
          getVenue(c.venueId).name,
          getEventType(c.needs.eventType).label,
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [state.cases, query, status, venue, assignee, complexity, fromDate, onlyConflicts, onlyMissing])

  function resetFilters() {
    setQuery("")
    setStatus(ANY)
    setVenue(ANY)
    setAssignee(ANY)
    setComplexity(ANY)
    setFromDate("")
    setOnlyConflicts(false)
    setOnlyMissing(false)
  }

  const filtersActive =
    query !== "" ||
    status !== ANY ||
    venue !== ANY ||
    assignee !== ANY ||
    complexity !== ANY ||
    fromDate !== "" ||
    onlyConflicts ||
    onlyMissing

  return (
    <div className="animate-fade mx-auto flex max-w-[95rem] flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <PageHeading
        eyebrow="Intern saksbehandling"
        title="Felles innboks"
        description="Alle forespørsler i fellesrådet, med automatisk kontroll, kalenderstatus og kompleksitet."
      />

      <section aria-label="Nøkkeltall" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Til vurdering" value={stats.awaitingReview} icon={Inbox} tone="info" />
        <StatCard
          label="Venter på søker"
          value={stats.awaitingApplicant}
          icon={MessageCircleQuestion}
          tone="warning"
        />
        <StatCard
          label="Med kalenderkonflikt"
          value={stats.withConflict}
          icon={CalendarX}
          tone="danger"
        />
        <StatCard label="Ikke tildelt" value={stats.unassigned} icon={UserX} tone="primary" />
      </section>

      <section aria-label="Søk og filtre" className="glass-card flex flex-col gap-4 p-4 sm:p-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk på saksnummer, søker, lokale eller arrangement"
            aria-label="Søk i forespørsler"
            className="pl-10"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="f-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Alle statuser</SelectItem>
                {CASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CASE_STATUS_SHORT[s as CaseStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-venue">Lokale</Label>
            <Select value={venue} onValueChange={setVenue}>
              <SelectTrigger id="f-venue" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Alle lokaler</SelectItem>
                {VENUES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-assignee">Ansvarlig</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="f-assignee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Alle</SelectItem>
                <SelectItem value="ingen">Ikke tildelt</SelectItem>
                {STAFF.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-complexity">Kompleksitet</Label>
            <Select value={complexity} onValueChange={setComplexity}>
              <SelectTrigger id="f-complexity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Alle nivåer</SelectItem>
                {(["lav", "middels", "hoy"] as ComplexityLevel[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {COMPLEXITY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-date">Dato fra og med</Label>
            <Input
              id="f-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-base">
            <Checkbox
              checked={onlyConflicts}
              onCheckedChange={(c) => setOnlyConflicts(c === true)}
            />
            Bare saker med kalenderkonflikt
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-base">
            <Checkbox checked={onlyMissing} onCheckedChange={(c) => setOnlyMissing(c === true)} />
            Bare saker som mangler informasjon
          </label>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-base text-primary underline-offset-4 hover:underline"
            >
              Nullstill filtre
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="saksliste" className="flex flex-col gap-3">
        <h2 id="saksliste" className="text-xl font-semibold">
          Forespørsler
          <span className="ml-2 text-base font-normal tracking-normal text-muted-foreground">
            ({visible.length} av {state.cases.length})
          </span>
        </h2>

        {visible.length === 0 ? (
          <p className="glass-card p-8 text-center text-muted-foreground">
            Ingen saker samsvarer med filtrene. Nullstill filtrene for å se alle.
          </p>
        ) : (
          <div className="glass-card overflow-x-auto p-0">
            <table className="w-full min-w-[68rem] border-collapse text-left">
              <caption className="sr-only">
                Forespørsler med status, kompleksitet og ansvarlig saksbehandler
              </caption>
              <thead>
                <tr className="border-b border-primary/15 text-sm text-muted-foreground">
                  {[
                    "Saksnummer",
                    "Arrangement",
                    "Søker",
                    "Lokale",
                    "Dato",
                    "Status",
                    "Kompleksitet",
                    "Merknader",
                    "Ansvarlig",
                    "Sist oppdatert",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-primary/10 align-top transition-colors last:border-0 hover:bg-white/60"
                  >
                    <td className="px-3 py-3">
                      <Link
                        to={`/saksbehandling/sak/${c.id}`}
                        className="rounded font-mono text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-primary/30"
                      >
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium">{getEventType(c.needs.eventType).label}</span>
                      <span className="block text-sm text-muted-foreground">
                        {c.needs.expectedAttendees} personer
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span>{c.applicant.name}</span>
                      {c.applicant.organization && (
                        <span className="block text-sm text-muted-foreground">
                          {c.applicant.organization}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm">{getVenue(c.venueId).name}</td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap tabular-nums">
                      {formatShortDate(c.needs.date)}
                      <span className="block text-muted-foreground">
                        {c.needs.startTime}–{c.needs.endTime}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3">
                      <ComplexityBadge level={c.complexity.level} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {c.availability.conflicts.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-danger">
                            <CalendarX className="size-4 shrink-0" aria-hidden="true" />
                            Kalenderkonflikt
                          </span>
                        )}
                        {c.missingInfo.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-warning">
                            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                            Mangler {c.missingInfo.length} punkter
                          </span>
                        )}
                        {c.availability.conflicts.length === 0 && c.missingInfo.length === 0 && (
                          <span className="text-sm text-muted-foreground">Ingen</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {c.assignedTo ? (
                        staffName(c.assignedTo)
                      ) : (
                        <span className="text-muted-foreground">Ikke tildelt</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                      {formatDateTime(c.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
