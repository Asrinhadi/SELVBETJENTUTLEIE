import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppRoutes } from "@/App"
import { RentalProvider } from "@/context/RentalContext"
import { createInitialState } from "@/context/rentalReducer"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RentalProvider initialState={createInitialState()}>
        <AppRoutes />
      </RentalProvider>
    </MemoryRouter>,
  )
}

describe("offentlig forespørsel", () => {
  it("oppdaterer oppsummeringen umiddelbart når tidspunktet endres", async () => {
    const user = userEvent.setup()
    renderAt("/")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Send forespørsel/)

    const summary = screen.getByRole("complementary", { name: /Oppsummering/ })
    expect(within(summary).getByText("Ser ledig ut")).toBeInTheDocument()

    const start = screen.getByLabelText(/Starttid/)
    await user.clear(start)
    await user.type(start, "06:00")

    expect(await within(summary).findByText("Må avklares")).toBeInTheDocument()
    expect(within(summary).getByText(/Foreløpig pris/)).toBeInTheDocument()
  })

  it("viser valideringsfeil når skjemaet sendes tomt", async () => {
    const user = userEvent.setup()
    renderAt("/")

    await user.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    const alerts = await screen.findAllByRole("alert")
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText("Velg hvilket bygg du ønsker å leie.")).toBeInTheDocument()
    expect(screen.getByText("Velg formålet med leien.")).toBeInTheDocument()
    expect(screen.getByText("Du må bekrefte at dette bare er en forespørsel.")).toBeInTheDocument()
  })

  it("viser feil for ugyldig tidsrom samtidig med andre feil", async () => {
    const user = userEvent.setup()
    renderAt("/")

    const end = screen.getByLabelText(/Sluttid/)
    await user.clear(end)
    await user.type(end, "17:00")
    await user.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(
      await screen.findByText("Sluttid må være etter starttid.", { selector: "[role=alert]" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Velg hvilket bygg du ønsker å leie.")).toBeInTheDocument()
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

  it("godkjenner en sak og oppretter tre oppgaver", async () => {
    const user = userEvent.setup()
    renderAt("/admin/saker/req-2026-041")

    await user.click(await screen.findByRole("button", { name: "Godkjenn" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: /Ja, godkjenn/ }))

    const tasks = await screen.findByRole("region", { name: "Oppgaver" })
    expect(within(tasks).getAllByRole("checkbox")).toHaveLength(3)
    expect(within(tasks).getByText("Klargjør og send kontrakt")).toBeInTheDocument()
    expect(screen.getByText("Bekreftelse opprettet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Godkjenn" })).not.toBeInTheDocument()
  })

  it("krever begrunnelse ved avslag", async () => {
    const user = userEvent.setup()
    renderAt("/admin/saker/req-2026-041")

    await user.click(await screen.findByRole("button", { name: "Avslå" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: /Avslå forespørselen/ }))
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/minst 10 tegn/)

    await user.type(within(dialog).getByLabelText(/Begrunnelse/), "Kirken er opptatt denne dagen.")
    await user.click(within(dialog).getByRole("button", { name: /Avslå forespørselen/ }))

    expect(await screen.findByText(/Saken er avslått og kan ikke behandles videre/)).toBeInTheDocument()
  })
})
