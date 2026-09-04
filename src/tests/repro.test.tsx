import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppRoutes } from "@/App"
import { KirkeFlowProvider } from "@/context/KirkeFlowContext"
import { createInitialState } from "@/context/kirkeflowReducer"

const user = () => userEvent.setup({ pointerEventsCheck: 0 })

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <KirkeFlowProvider initialState={createInitialState()}>
        <AppRoutes />
      </KirkeFlowProvider>
    </MemoryRouter>,
  )
}

async function goToStep5(u: ReturnType<typeof user>) {
  await u.type(
    await screen.findByLabelText(/Kort beskrivelse/),
    "Adventskonsert med kor og strykere, åpen for alle.",
  )
  await u.click(screen.getByRole("button", { name: /Neste/ }))

  const cards = await screen.findAllByRole("article")
  await u.click(within(cards[0] as HTMLElement).getByRole("button", { name: /Velg lokalet/ }))

  await screen.findByText("Slik blokkeres lokalet")
  await u.click(screen.getByRole("button", { name: /Neste/ }))

  await screen.findByText("Foreløpig totalsum")
  await u.click(screen.getByRole("button", { name: /Neste/ }))

  await screen.findByText("Kontroller forespørselen")
}

describe("kontaktopplysninger fylles aldri inn stille", () => {
  it("starter med tomme felt", async () => {
    const u = user()
    renderApp("/")
    await goToStep5(u)

    expect(screen.getByLabelText(/^E-post/)).toHaveValue("")
    expect(screen.getByLabelText(/^Telefon/)).toHaveValue("")
    expect(screen.getByLabelText(/^Navn/)).toHaveValue("")
  })

  it("blokkerer innsending når feltene er tomme", async () => {
    const u = user()
    renderApp("/")
    await goToStep5(u)

    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(screen.getByText("Kontroller forespørselen")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Forespørselen er mottatt/ })).toBeNull()
    expect(screen.getByText("Skriv inn e-postadressen din.")).toBeInTheDocument()
    expect(screen.getByText("Skriv inn navnet ditt.")).toBeInTheDocument()
  })

  it("fyller inn testopplysninger først når brukeren klikker på knappen", async () => {
    const u = user()
    renderApp("/")
    await goToStep5(u)

    await u.click(screen.getByRole("button", { name: /Fyll inn fiktive testopplysninger/ }))

    expect(screen.getByLabelText(/^E-post/)).toHaveValue("kari.nordmann@example.com")
    expect(screen.getByLabelText(/^Telefon/)).toHaveValue("900 00 100")
    expect(screen.getByLabelText(/^Navn/)).toHaveValue("Kari Nordmann")
  })
})
