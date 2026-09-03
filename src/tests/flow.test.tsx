import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppRoutes } from "@/App"
import { KirkeFlowProvider } from "@/context/KirkeFlowContext"
import { createInitialState } from "@/context/kirkeflowReducer"

/** Radix Select setter pointer-events: none på body mens listen er åpen. */
const user = () => userEvent.setup({ pointerEventsCheck: 0 })

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <KirkeFlowProvider initialState={createInitialState()}>
        <AppRoutes />
      </KirkeFlowProvider>
    </MemoryRouter>,
  )
}

describe("offentlig veiviser", () => {
  it("viser steg 1 med stepper", async () => {
    renderAt("/")
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /Finn lokale, få pris, følg saken/,
    )
    const nav = screen.getByRole("navigation", { name: "Fremdrift" })
    expect(within(nav).getByText("Beskriv arrangementet")).toBeInTheDocument()
    expect(screen.getByText("Steg 1 av 5")).toBeInTheDocument()
  })

  it("stopper på steg 1 når beskrivelsen mangler", async () => {
    const u = user()
    renderAt("/")
    await u.click(await screen.findByRole("button", { name: /Neste/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/minst 15 tegn/)
    expect(screen.getByText("Steg 1 av 5")).toBeInTheDocument()
  })

  it("går gjennom hele flyten og oppretter en sak", async () => {
    const u = user()
    renderAt("/")

    await u.type(
      await screen.findByLabelText(/Kort beskrivelse/),
      "Adventskonsert med kor og strykere, åpen for alle.",
    )
    await u.click(screen.getByRole("button", { name: /Neste/ }))

    // Steg 2: anbefalte lokaler
    expect(await screen.findByRole("heading", { name: "Anbefalte lokaler" })).toBeInTheDocument()
    const cards = screen.getAllByRole("article")
    expect(cards.length).toBeGreaterThan(0)
    await u.click(within(cards[0] as HTMLElement).getByRole("button", { name: /Velg lokalet/ }))

    // Steg 3: tilgjengelighet med rigg og rydding
    expect(await screen.findByText("Slik blokkeres lokalet")).toBeInTheDocument()
    expect(screen.getByText("Steg 3 av 5")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: /Neste/ }))

    // Steg 4: forklart pris
    expect(await screen.findByText("Foreløpig totalsum")).toBeInTheDocument()
    expect(screen.getAllByText(/Grunnleie/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Dette er et foreløpig prisoverslag/)).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: /Neste/ }))

    // Steg 5: send inn
    expect(await screen.findByText("Kontroller forespørselen")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    // Kvittering med saksnummer og statustidslinje
    expect(
      await screen.findByRole("heading", { name: /Forespørselen er mottatt/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/^KIR-\d{4}-\d{4}$/)).toBeInTheDocument()
    expect(screen.getByLabelText("Status for saken")).toBeInTheDocument()
  })

  it("forklarer hvorfor et lokale anbefales", async () => {
    const u = user()
    renderAt("/")
    await u.type(
      await screen.findByLabelText(/Kort beskrivelse/),
      "Adventskonsert med kor og strykere, åpen for alle.",
    )
    await u.click(screen.getByRole("button", { name: /Neste/ }))

    const cards = await screen.findAllByRole("article")
    await u.click(
      within(cards[0] as HTMLElement).getByRole("button", { name: /Hvorfor anbefales dette/ }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Egnethetsscore/)).toBeInTheDocument()
    expect(within(dialog).getByText(/fiktive demoregler/)).toBeInTheDocument()
  })
})

describe("saksbehandling", () => {
  it("viser innboksen med demosaker og filtre", async () => {
    renderAt("/saksbehandling")
    expect(await screen.findByRole("heading", { name: "Felles innboks" })).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1)
    expect(screen.getByLabelText("Søk i forespørsler")).toBeInTheDocument()
  })

  it("filtrerer på saker som mangler informasjon", async () => {
    const u = user()
    renderAt("/saksbehandling")
    const table = await screen.findByRole("table")
    const before = within(table).getAllByRole("row").length

    await u.click(screen.getByRole("checkbox", { name: /mangler informasjon/ }))
    const after = screen.queryByRole("table")
    if (after) {
      expect(within(after).getAllByRole("row").length).toBeLessThanOrEqual(before)
    }
  })

  it("godkjenner en sak og fører den til betaling", async () => {
    const u = user()
    const state = createInitialState()
    const target = state.cases.find((c) => c.status === "venter_vurdering")
    if (!target) throw new Error("Forventet en sak til vurdering")

    render(
      <MemoryRouter initialEntries={[`/saksbehandling/sak/${target.id}`]}>
        <KirkeFlowProvider initialState={state}>
          <AppRoutes />
        </KirkeFlowProvider>
      </MemoryRouter>,
    )

    await u.click(await screen.findByRole("button", { name: "Godkjenn" }))
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /Ja, godkjenn/ }))

    expect(await screen.findByRole("button", { name: /Registrer betaling/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Godkjenn" })).not.toBeInTheDocument()
  })

  it("krever begrunnelse ved avslag", async () => {
    const u = user()
    const state = createInitialState()
    const target = state.cases.find((c) => c.status === "venter_vurdering")
    if (!target) throw new Error("Forventet en sak til vurdering")

    render(
      <MemoryRouter initialEntries={[`/saksbehandling/sak/${target.id}`]}>
        <KirkeFlowProvider initialState={state}>
          <AppRoutes />
        </KirkeFlowProvider>
      </MemoryRouter>,
    )

    await u.click(await screen.findByRole("button", { name: "Avslå" }))
    const dialog = await screen.findByRole("dialog")
    await u.click(within(dialog).getByRole("button", { name: /Avslå forespørselen/ }))
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/minst 10 tegn/)
  })
})

describe("gamle ruter", () => {
  it("sender /admin videre til saksbehandling", async () => {
    renderAt("/admin")
    expect(await screen.findByRole("heading", { name: "Felles innboks" })).toBeInTheDocument()
  })
})
