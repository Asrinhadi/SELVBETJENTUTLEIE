import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppRoutes } from "@/App"
import { RentalProvider } from "@/context/RentalContext"
import { STORAGE_KEY } from "@/context/persistence"
import { createInitialState } from "@/context/rentalReducer"
import { DEMO_REQUESTS } from "@/data/demoData"

function renderAt(path: string, options: { persisted?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RentalProvider initialState={options.persisted ? undefined : createInitialState()}>
        <AppRoutes />
      </RentalProvider>
    </MemoryRouter>,
  )
}

function readStoredReferences(): string[] {
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== "object" || parsed === null || !("state" in parsed)) return []
  const state = parsed.state
  if (typeof state !== "object" || state === null || !("requests" in state)) return []
  const requests = state.requests
  if (!Array.isArray(requests)) return []
  return requests.map((request: unknown) =>
    typeof request === "object" && request !== null && "reference" in request
      ? String(request.reference)
      : "",
  )
}

// Radix Select setter pointer-events: none på body mens listen er åpen.
const user = () => userEvent.setup({ pointerEventsCheck: 0 })

function first<T>(items: readonly T[]): T {
  const item = items[0]
  if (item === undefined) throw new Error("Forventet minst ett element")
  return item
}

function seedStorageWithExtraRequest() {
  const seeded = createInitialState()
  const extra = { ...structuredClone(first(DEMO_REQUESTS)), id: "req-x", reference: "UTL-2026-099" }
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, state: { ...seeded, requests: [extra, ...seeded.requests] } }),
  )
}

describe("offentlig forespørsel", () => {
  it("oppdaterer oppsummeringen umiddelbart når tidspunktet endres", async () => {
    const u = user()
    renderAt("/")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Send forespørsel/)

    const summary = screen.getByRole("complementary", { name: /Oppsummering/ })
    expect(within(summary).getByText("Ser ledig ut")).toBeInTheDocument()

    const start = screen.getByLabelText(/Starttid/)
    await u.clear(start)
    await u.type(start, "06:00")

    expect(await within(summary).findByText("Må avklares")).toBeInTheDocument()
    expect(within(summary).getByText(/Foreløpig pris/)).toBeInTheDocument()
  })

  it("viser valideringsfeil når skjemaet sendes tomt", async () => {
    const u = user()
    renderAt("/")

    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    const alerts = await screen.findAllByRole("alert")
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText("Velg hvilket bygg du ønsker å leie.")).toBeInTheDocument()
    expect(screen.getByText("Velg formålet med leien.")).toBeInTheDocument()
    expect(screen.getByText("Du må bekrefte at dette bare er en forespørsel.")).toBeInTheDocument()
  })

  it("viser feil for ugyldig tidsrom samtidig med andre feil", async () => {
    const u = user()
    renderAt("/")

    const end = screen.getByLabelText(/Sluttid/)
    await u.clear(end)
    await u.type(end, "17:00")
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(
      await screen.findByText("Sluttid må være etter starttid.", { selector: "[role=alert]" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Velg hvilket bygg du ønsker å leie.")).toBeInTheDocument()
  })

  it("sender inn en forespørsel, viser bekreftelse og legger saken øverst i innboksen", async () => {
    const u = user()
    renderAt("/", { persisted: true })

    await u.click(screen.getByRole("combobox", { name: /^Bygg/ }))
    await u.click(await screen.findByRole("option", { name: /Tune kirke/ }))

    await u.click(screen.getByRole("combobox", { name: /^Formål/ }))
    await u.click(await screen.findByRole("option", { name: /Konsert uten billettinntekter/ }))

    const summary = screen.getByRole("complementary", { name: /Oppsummering/ })
    expect(await within(summary).findByText("3 910 kr")).toBeInTheDocument()

    await u.type(
      screen.getByLabelText(/Beskrivelse av arrangementet/),
      "Vårkonsert med kor og orgel for hele menigheten.",
    )
    await u.click(screen.getByRole("checkbox", { name: /Jeg forstår at dette bare er en forespørsel/ }))
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(await screen.findByRole("heading", { name: /Forespørselen er mottatt/ })).toBeInTheDocument()
    expect(screen.getByText("UTL-2026-042")).toBeInTheDocument()

    // Tilstanden er lagret i sessionStorage med den nye saken først.
    expect(readStoredReferences()[0]).toBe("UTL-2026-042")

    await u.click(screen.getByRole("link", { name: /Følg saken i intern innboks/ }))
    expect(await screen.findByRole("heading", { name: "UTL-2026-042" })).toBeInTheDocument()
    expect(screen.getByText(/Tune kirke/, { selector: "dd" })).toBeInTheDocument()

    const list = screen.getByRole("region", { name: /Forespørsler/ })
    const firstItem = first(within(list).getAllByRole("link"))
    expect(firstItem).toHaveTextContent("UTL-2026-042")
    expect(firstItem).toHaveAttribute("aria-current", "page")
  })
})

describe("intern innboks", () => {
  it("viser nøkkeltall og listen over demo-saker", async () => {
    renderAt("/admin")

    const stats = await screen.findByRole("region", { name: "Nøkkeltall" })
    expect(within(stats).getByText("Nye saker")).toBeInTheDocument()
    expect(screen.getByText("UTL-2026-041")).toBeInTheDocument()
    expect(screen.getByText("UTL-2026-039")).toBeInTheDocument()
  })

  it("godkjenner en sak og oppretter nøyaktig tre oppgaver", async () => {
    const u = user()
    renderAt("/admin/saker/req-2026-041")

    const stats = await screen.findByRole("region", { name: "Nøkkeltall" })
    const openTasksBefore = Number(
      within(stats).getByText("Åpne oppgaver").previousElementSibling?.textContent,
    )

    await u.click(await screen.findByRole("button", { name: "Godkjenn" }))
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /Ja, godkjenn/ }))

    const tasks = await screen.findByRole("region", { name: "Oppgaver" })
    expect(within(tasks).getAllByRole("checkbox")).toHaveLength(3)
    expect(within(tasks).getByText("Klargjør og send kontrakt")).toBeInTheDocument()
    expect(within(tasks).getByText("Opprett fakturagrunnlag")).toBeInTheDocument()
    expect(within(tasks).getByText("Avtal utlevering av nøkler")).toBeInTheDocument()
    expect(screen.getByText("Bekreftelse opprettet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Godkjenn" })).not.toBeInTheDocument()

    const openTasksAfter = Number(
      within(stats).getByText("Åpne oppgaver").previousElementSibling?.textContent,
    )
    expect(openTasksAfter).toBe(openTasksBefore + 3)

    // Oppgaver kan hukes av, og statistikken følger med.
    await u.click(first(within(tasks).getAllByRole("checkbox")))
    expect(within(tasks).getByText("1 av 3 ferdig")).toBeInTheDocument()
  })

  it("krever begrunnelse ved avslag", async () => {
    const u = user()
    renderAt("/admin/saker/req-2026-041")

    await u.click(await screen.findByRole("button", { name: "Avslå" }))
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /Avslå forespørselen/ }))
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/minst 10 tegn/)

    await u.type(within(dialog).getByLabelText(/Begrunnelse/), "Kirken er opptatt denne dagen.")
    await u.click(within(dialog).getByRole("button", { name: /Avslå forespørselen/ }))

    expect(await screen.findByText(/Saken er avslått og kan ikke behandles videre/)).toBeInTheDocument()
  })

  it("ber om mer informasjon og endrer status til «Venter på svar»", async () => {
    const u = user()
    renderAt("/admin/saker/req-2026-041")

    await u.click(await screen.findByRole("button", { name: "Be om mer informasjon" }))
    const dialog = await screen.findByRole("dialog")
    await u.type(within(dialog).getByLabelText(/Melding til søker/), "Hvor mange kommer, cirka?")
    await u.click(within(dialog).getByRole("button", { name: /Send melding/ }))

    const article = await screen.findByRole("article")
    expect(within(article).getByText("Venter på svar")).toBeInTheDocument()
    expect(within(article).getByText(/Hvor mange kommer, cirka\?/)).toBeInTheDocument()
  })
})

describe("lagring og nullstilling", () => {
  it("laster tilstand fra sessionStorage ved oppstart", async () => {
    seedStorageWithExtraRequest()
    renderAt("/admin", { persisted: true })
    expect(await screen.findByText("UTL-2026-099")).toBeInTheDocument()
  })

  it("ignorerer ugyldig lagret tilstand og faller tilbake til demo-sakene", async () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{ikke gyldig json")
    renderAt("/admin", { persisted: true })
    expect(await screen.findByText("UTL-2026-041")).toBeInTheDocument()
    expect(readStoredReferences()).toHaveLength(DEMO_REQUESTS.length)
  })

  it("nullstiller demoen til de opprinnelige sakene", async () => {
    const u = user()
    seedStorageWithExtraRequest()
    renderAt("/admin/saker/req-x", { persisted: true })
    expect(await screen.findByRole("heading", { name: "UTL-2026-099" })).toBeInTheDocument()

    await u.click(screen.getByRole("button", { name: /Nullstill demo/ }))
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /Nullstill demo/ }))

    expect(await screen.findByRole("heading", { name: "Velg en sak" })).toBeInTheDocument()
    expect(screen.queryByText("UTL-2026-099")).not.toBeInTheDocument()
    expect(readStoredReferences()).toEqual(DEMO_REQUESTS.map((r) => r.reference))
  })
})
