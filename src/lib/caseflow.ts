import { addDays, formatISO, parseISO, subDays, isValid, isBefore } from "date-fns"

import type {
  CaseTask,
  HistoryEvent,
  HistoryEventType,
  RentalRequest,
  RentalRequestInput,
  TaskType,
} from "@/domain/rental"

export const CASE_WORKER = "Saksbehandler"
export const SYSTEM_ACTOR = "System"

export function buildReference(year: number, sequence: number): string {
  return `UTL-${year}-${String(sequence).padStart(3, "0")}`
}

function toIsoDate(date: Date): string {
  return formatISO(date, { representation: "date" })
}

function nextEventId(request: Pick<RentalRequest, "id" | "history">): string {
  return `${request.id}-evt-${request.history.length + 1}`
}

export function createHistoryEvent(
  request: Pick<RentalRequest, "id" | "history">,
  type: HistoryEventType,
  actor: string,
  message: string,
  timestamp: string,
): HistoryEvent {
  return { id: nextEventId(request), type, actor, message, timestamp }
}

/**
 * Oppretter en ny sak fra skjemaet. Ren funksjon: tidspunkt og løpenummer
 * sendes inn slik at resultatet er deterministisk og testbart.
 */
export function createRentalRequest(
  input: RentalRequestInput,
  sequence: number,
  now: Date,
): RentalRequest {
  const timestamp = now.toISOString()
  const id = `req-${now.getFullYear()}-${String(sequence).padStart(3, "0")}`
  const reference = buildReference(now.getFullYear(), sequence)

  const base: RentalRequest = {
    id,
    reference,
    status: "new",
    buildingId: input.buildingId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    purposeId: input.purposeId,
    description: input.description,
    applicant: input.applicant,
    createdAt: timestamp,
    confirmationCreated: false,
    tasks: [],
    history: [],
    ...(input.estimatedTicketRevenue !== undefined
      ? { estimatedTicketRevenue: input.estimatedTicketRevenue }
      : {}),
  }

  return {
    ...base,
    history: [
      createHistoryEvent(
        base,
        "submitted",
        input.applicant.name,
        `Forespørsel sendt inn via offentlig skjema. Referanse ${reference}.`,
        timestamp,
      ),
    ],
  }
}

interface TaskTemplate {
  type: TaskType
  title: string
  responsibleRole: string
  dueDate: (approvedAt: Date, eventDate: Date) => Date
}

const TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    type: "contract",
    title: "Klargjør og send kontrakt",
    responsibleRole: "Saksbehandler",
    dueDate: (approvedAt) => addDays(approvedAt, 3),
  },
  {
    type: "invoice",
    title: "Opprett fakturagrunnlag",
    responsibleRole: "Økonomi",
    dueDate: (approvedAt) => addDays(approvedAt, 7),
  },
  {
    type: "keys",
    title: "Avtal utlevering av nøkler",
    responsibleRole: "Kirketjener",
    dueDate: (approvedAt, eventDate) => {
      const twoDaysBefore = subDays(eventDate, 2)
      return isBefore(twoDaysBefore, approvedAt)
        ? addDays(approvedAt, 1)
        : twoDaysBefore
    },
  },
]

export function buildApprovalTasks(
  request: Pick<RentalRequest, "id" | "date">,
  approvedAt: Date,
): CaseTask[] {
  const parsedEventDate = parseISO(request.date)
  const eventDate = isValid(parsedEventDate) ? parsedEventDate : approvedAt

  return TASK_TEMPLATES.map((template) => ({
    id: `${request.id}-task-${template.type}`,
    type: template.type,
    title: template.title,
    responsibleRole: template.responsibleRole,
    dueDate: toIsoDate(template.dueDate(approvedAt, eventDate)),
    completed: false,
  }))
}

/**
 * Godkjenner en sak: setter status, markerer at bekreftelse er opprettet,
 * oppretter de tre standardoppgavene og skriver til historikken.
 * Hvis saken allerede er godkjent returneres den uendret.
 */
export function approveRequest(
  request: RentalRequest,
  at: Date,
): RentalRequest {
  if (request.status === "approved") return request

  const timestamp = at.toISOString()
  const tasks = buildApprovalTasks(request, at)

  let next: RentalRequest = {
    ...request,
    status: "approved",
    confirmationCreated: true,
    tasks,
  }

  next = appendEvent(
    next,
    "approved",
    CASE_WORKER,
    "Forespørselen er godkjent.",
    timestamp,
  )
  next = appendEvent(
    next,
    "confirmation_created",
    SYSTEM_ACTOR,
    "Bekreftelse til søker er opprettet automatisk.",
    timestamp,
  )
  next = appendEvent(
    next,
    "tasks_created",
    SYSTEM_ACTOR,
    `${tasks.length} oppgaver opprettet automatisk: ${tasks.map((t) => t.title).join(", ")}.`,
    timestamp,
  )

  return next
}

export function rejectRequest(
  request: RentalRequest,
  reason: string,
  at: Date,
): RentalRequest {
  return appendEvent(
    { ...request, status: "rejected" },
    "rejected",
    CASE_WORKER,
    `Forespørselen er avslått. Begrunnelse: ${reason}`,
    at.toISOString(),
  )
}

export function requestMoreInfo(
  request: RentalRequest,
  message: string,
  at: Date,
): RentalRequest {
  return appendEvent(
    { ...request, status: "needs_info" },
    "info_requested",
    CASE_WORKER,
    `Melding sendt til søker: ${message}`,
    at.toISOString(),
  )
}

export function setTaskCompleted(
  request: RentalRequest,
  taskId: string,
  completed: boolean,
  at: Date,
): RentalRequest {
  const task = request.tasks.find((t) => t.id === taskId)
  if (!task || task.completed === completed) return request

  const tasks = request.tasks.map((t) =>
    t.id === taskId ? { ...t, completed } : t,
  )

  return appendEvent(
    { ...request, tasks },
    completed ? "task_completed" : "task_reopened",
    CASE_WORKER,
    completed
      ? `Oppgaven «${task.title}» er markert som ferdig.`
      : `Oppgaven «${task.title}» er gjenåpnet.`,
    at.toISOString(),
  )
}

function appendEvent(
  request: RentalRequest,
  type: HistoryEventType,
  actor: string,
  message: string,
  timestamp: string,
): RentalRequest {
  return {
    ...request,
    history: [
      ...request.history,
      createHistoryEvent(request, type, actor, message, timestamp),
    ],
  }
}

export function countOpenTasks(requests: readonly RentalRequest[]): number {
  return requests.reduce(
    (sum, request) => sum + request.tasks.filter((t) => !t.completed).length,
    0,
  )
}
