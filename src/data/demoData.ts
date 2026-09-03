import type { RentalRequest } from "@/domain/rental"

/**
 * Fiktive saker som demoen starter med. Alle navn, e-poster og telefonnumre
 * er oppdiktet. Nummerserien fortsetter fra DEMO_NEXT_SEQUENCE når nye
 * forespørsler sendes inn.
 */
export const DEMO_YEAR = 2026
export const DEMO_NEXT_SEQUENCE = 42

export const DEMO_REQUESTS: readonly RentalRequest[] = [
  {
    id: "req-2026-041",
    reference: "UTL-2026-041",
    status: "new",
    buildingId: "sarpsborg",
    date: "2026-10-17",
    startTime: "18:00",
    endTime: "21:30",
    purposeId: "concert_ticketed",
    estimatedTicketRevenue: 42000,
    description:
      "Høstkonsert med Sarpsborg kammerkor og strykekvartett. Ca. 180 publikummere, billettsalg via nettside. Trenger tilgang fra kl. 16 til rigging.",
    applicant: {
      name: "Ingrid Solberg",
      organization: "Sarpsborg kammerkor",
      email: "ingrid.solberg@example.org",
      phone: "917 45 210",
    },
    createdAt: "2026-09-02T09:14:00.000Z",
    confirmationCreated: false,
    tasks: [],
    history: [
      {
        id: "req-2026-041-evt-1",
        type: "submitted",
        timestamp: "2026-09-02T09:14:00.000Z",
        actor: "Ingrid Solberg",
        message:
          "Forespørsel sendt inn via offentlig skjema. Referanse UTL-2026-041.",
      },
    ],
  },
  {
    id: "req-2026-040",
    reference: "UTL-2026-040",
    status: "needs_info",
    buildingId: "greaker",
    date: "2026-10-03",
    startTime: "12:00",
    endTime: "17:00",
    purposeId: "party_seminar",
    description:
      "Konfirmasjonsselskap for ca. 45 gjester. Ønsker å bruke kjøkkenet og storsalen. Vi tar med egen mat.",
    applicant: {
      name: "Jonas Halvorsen",
      email: "jonas.halvorsen@example.net",
      phone: "402 18 776",
    },
    createdAt: "2026-08-28T14:02:00.000Z",
    confirmationCreated: false,
    tasks: [],
    history: [
      {
        id: "req-2026-040-evt-1",
        type: "submitted",
        timestamp: "2026-08-28T14:02:00.000Z",
        actor: "Jonas Halvorsen",
        message:
          "Forespørsel sendt inn via offentlig skjema. Referanse UTL-2026-040.",
      },
      {
        id: "req-2026-040-evt-2",
        type: "info_requested",
        timestamp: "2026-08-31T07:45:00.000Z",
        actor: "Saksbehandler",
        message:
          "Melding sendt til søker: Hei! Kan du bekrefte om dere trenger bord og stoler til alle 45, og om dere ønsker tilgang til storkjøkkenet eller bare tekjøkkenet? Da kan vi gi deg en pris.",
      },
    ],
  },
  {
    id: "req-2026-039",
    reference: "UTL-2026-039",
    status: "approved",
    buildingId: "tune",
    date: "2026-09-26",
    startTime: "19:00",
    endTime: "21:00",
    purposeId: "concert_free",
    description:
      "Gratis kveldskonsert med lokalt ungdomskor. Åpen for alle, ingen billettsalg. Enkel lyd- og lysbruk, ingen rigging utover flygel.",
    applicant: {
      name: "Marte Eide",
      organization: "Tune ungdomskor",
      email: "marte.eide@example.com",
      phone: "958 33 104",
    },
    createdAt: "2026-08-20T10:30:00.000Z",
    confirmationCreated: true,
    tasks: [
      {
        id: "req-2026-039-task-contract",
        type: "contract",
        title: "Klargjør og send kontrakt",
        responsibleRole: "Saksbehandler",
        dueDate: "2026-08-25",
        completed: true,
      },
      {
        id: "req-2026-039-task-invoice",
        type: "invoice",
        title: "Opprett fakturagrunnlag",
        responsibleRole: "Økonomi",
        dueDate: "2026-08-29",
        completed: false,
      },
      {
        id: "req-2026-039-task-keys",
        type: "keys",
        title: "Avtal utlevering av nøkler",
        responsibleRole: "Kirketjener",
        dueDate: "2026-09-24",
        completed: false,
      },
    ],
    history: [
      {
        id: "req-2026-039-evt-1",
        type: "submitted",
        timestamp: "2026-08-20T10:30:00.000Z",
        actor: "Marte Eide",
        message:
          "Forespørsel sendt inn via offentlig skjema. Referanse UTL-2026-039.",
      },
      {
        id: "req-2026-039-evt-2",
        type: "approved",
        timestamp: "2026-08-22T08:10:00.000Z",
        actor: "Saksbehandler",
        message: "Forespørselen er godkjent.",
      },
      {
        id: "req-2026-039-evt-3",
        type: "confirmation_created",
        timestamp: "2026-08-22T08:10:00.000Z",
        actor: "System",
        message: "Bekreftelse til søker er opprettet automatisk.",
      },
      {
        id: "req-2026-039-evt-4",
        type: "tasks_created",
        timestamp: "2026-08-22T08:10:00.000Z",
        actor: "System",
        message:
          "3 oppgaver opprettet automatisk: Klargjør og send kontrakt, Opprett fakturagrunnlag, Avtal utlevering av nøkler.",
      },
      {
        id: "req-2026-039-evt-5",
        type: "task_completed",
        timestamp: "2026-08-24T12:20:00.000Z",
        actor: "Saksbehandler",
        message: "Oppgaven «Klargjør og send kontrakt» er markert som ferdig.",
      },
    ],
  },
  {
    id: "req-2026-038",
    reference: "UTL-2026-038",
    status: "rejected",
    buildingId: "skjeberg",
    date: "2026-09-20",
    startTime: "10:00",
    endTime: "13:00",
    purposeId: "rehearsal",
    description:
      "Korøvelse før høstens konsertrekke. Vi trenger tilgang til flygelet og ca. 25 stoler i koret.",
    applicant: {
      name: "Per Kristian Lunde",
      organization: "Skjeberg sangforening",
      email: "pk.lunde@example.org",
      phone: "926 70 431",
    },
    createdAt: "2026-08-15T16:45:00.000Z",
    confirmationCreated: false,
    tasks: [],
    history: [
      {
        id: "req-2026-038-evt-1",
        type: "submitted",
        timestamp: "2026-08-15T16:45:00.000Z",
        actor: "Per Kristian Lunde",
        message:
          "Forespørsel sendt inn via offentlig skjema. Referanse UTL-2026-038.",
      },
      {
        id: "req-2026-038-evt-2",
        type: "rejected",
        timestamp: "2026-08-18T09:05:00.000Z",
        actor: "Saksbehandler",
        message:
          "Forespørselen er avslått. Begrunnelse: Søndag 20. september er det gudstjeneste med dåp i Skjeberg kirke kl. 11. Kirken er ikke tilgjengelig i det ønskede tidsrommet. Send gjerne ny forespørsel for en hverdag eller lørdag.",
      },
    ],
  },
]
