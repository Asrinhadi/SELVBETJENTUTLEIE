import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppRoutes } from "@/App"
import { KirkeFlowProvider } from "@/context/KirkeFlowContext"
import { createInitialState } from "@/context/kirkeflowReducer"
import { DEMO_APPLICANT } from "@/components/wizard/wizardState"

const user = () => userEvent.setup({ pointerEventsCheck: 0 })

/** Verdier som ikke finnes noe annet sted i koden, så et treff må komme fra skjemaet. */
const TYPED = {
  name: "Astrid Vollen",
  organization: "Fiktiv Kulturforening",
  email: "astrid.vollen@example.org",
  phone: "900 00 199",
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <KirkeFlowProvider initialState={createInitialState()}>
        <AppRoutes />
      </KirkeFlowProvider>
    </MemoryRouter>,
  )
}

const fields = () => ({
  name: screen.getByLabelText(/^Navn/),
  organization: screen.getByLabelText(/^Forening eller virksomhet/),
  email: screen.getByLabelText(/^E-post/),
  phone: screen.getByLabelText(/^Telefon/),
})

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

async function typeAllFields(u: ReturnType<typeof user>) {
  const f = fields()
  await u.type(f.name, TYPED.name)
  await u.type(f.organization, TYPED.organization)
  await u.type(f.email, TYPED.email)
  await u.type(f.phone, TYPED.phone)
}

describe("manuell inntasting", () => {
  it("beholder det brukeren skriver i alle fire feltene", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    const f = fields()
    expect(f.name).toHaveValue(TYPED.name)
    expect(f.organization).toHaveValue(TYPED.organization)
    expect(f.email).toHaveValue(TYPED.email)
    expect(f.phone).toHaveValue(TYPED.phone)
  })

  it("beholder e-post og telefon også når de fylles ut hver for seg", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    await u.type(fields().email, "kun.epost@example.net")
    expect(fields().email).toHaveValue("kun.epost@example.net")
    expect(fields().phone).toHaveValue("")

    await u.type(fields().phone, "900 00 111")
    expect(fields().phone).toHaveValue("900 00 111")
    // E-posten skal ikke bli borte når telefon fylles ut.
    expect(fields().email).toHaveValue("kun.epost@example.net")
  })

  it("har autofyll slått av, så ingenting utenfra kan endre feltene", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    for (const field of Object.values(fields())) {
      expect(field).toHaveAttribute("autocomplete", "off")
    }
  })
})

describe("testdata-knappen", () => {
  it("fyller ut alle fire feltene synlig", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    await u.click(screen.getByRole("button", { name: /Fyll inn fiktive testopplysninger/ }))

    const f = fields()
    expect(f.name).toHaveValue(DEMO_APPLICANT.name)
    expect(f.organization).toHaveValue(DEMO_APPLICANT.organization ?? "")
    expect(f.email).toHaveValue(DEMO_APPLICANT.email)
    expect(f.phone).toHaveValue(DEMO_APPLICANT.phone)
  })

  it("kan overskrives av brukeren etterpå", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    await u.click(screen.getByRole("button", { name: /Fyll inn fiktive testopplysninger/ }))
    await u.clear(fields().email)
    await u.type(fields().email, TYPED.email)

    expect(fields().email).toHaveValue(TYPED.email)
  })
})

describe("tømming av felt", () => {
  it("blokkerer innsending når e-post tømmes etter utfylling", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    await u.clear(fields().email)
    expect(fields().email).toHaveValue("")

    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(screen.getByText("Kontroller forespørselen")).toBeInTheDocument()
    expect(screen.getByText("Skriv inn e-postadressen din.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Forespørselen er mottatt/ })).toBeNull()
  })

  it("blokkerer innsending når telefon tømmes etter utfylling", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    await u.clear(fields().phone)
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(screen.getByText("Skriv inn telefonnummeret ditt.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Forespørselen er mottatt/ })).toBeNull()
  })
})

describe("ugyldig format", () => {
  it("avviser e-post uten toppdomene", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    await u.clear(fields().email)
    await u.type(fields().email, "astrid@example")
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(screen.getByText("Skriv inn en gyldig e-postadresse.")).toBeInTheDocument()
  })

  it("avviser telefonnummer uten nok siffer", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    await u.clear(fields().phone)
    await u.type(fields().phone, "++++++++")
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(screen.getByText("Telefonnummeret må ha minst åtte siffer.")).toBeInTheDocument()
  })

  it("avviser bokstaver i telefonfeltet", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)

    await u.clear(fields().phone)
    await u.type(fields().phone, "ring meg")
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(
      screen.getByText(/Telefonnummeret kan bare inneholde tall, mellomrom/),
    ).toBeInTheDocument()
  })
})

describe("samsvar mellom skjema og opprettet sak", () => {
  it("lagrer nøyaktig det brukeren skrev, uten skjulte standardverdier", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)
    await typeAllFields(u)
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    // Kvitteringen hilser med det innskrevne navnet.
    expect(
      await screen.findByRole("heading", { name: /Forespørselen er mottatt/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(new RegExp(TYPED.name))).toBeInTheDocument()

    // Saksbehandlersiden viser kontaktopplysningene.
    await u.click(screen.getByRole("link", { name: /Se saken som saksbehandler/ }))
    expect(await screen.findByText(TYPED.email)).toBeInTheDocument()
    expect(screen.getByText(TYPED.phone)).toBeInTheDocument()
    expect(screen.getByText(TYPED.organization)).toBeInTheDocument()

    // Ingen demoverdier har sneket seg inn.
    expect(screen.queryByText(DEMO_APPLICANT.email)).toBeNull()
    expect(screen.queryByText(DEMO_APPLICANT.phone)).toBeNull()
    expect(screen.queryByText(DEMO_APPLICANT.name)).toBeNull()
  })

  it("trimmer mellomrom, men endrer ikke innholdet ellers", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    await u.type(fields().name, "  Astrid Vollen  ")
    await u.type(fields().email, "  astrid.vollen@example.org  ")
    await u.type(fields().phone, "  900 00 199  ")
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(
      await screen.findByRole("heading", { name: /Forespørselen er mottatt/ }),
    ).toBeInTheDocument()
    await u.click(screen.getByRole("link", { name: /Se saken som saksbehandler/ }))

    expect(await screen.findByText("astrid.vollen@example.org")).toBeInTheDocument()
    expect(screen.getByText("900 00 199")).toBeInTheDocument()
  })

  it("utelater virksomhet helt når feltet står tomt", async () => {
    const u = user()
    renderApp()
    await goToStep5(u)

    await u.type(fields().name, TYPED.name)
    await u.type(fields().email, TYPED.email)
    await u.type(fields().phone, TYPED.phone)
    await u.click(screen.getByRole("button", { name: /Send forespørsel/ }))

    expect(
      await screen.findByRole("heading", { name: /Forespørselen er mottatt/ }),
    ).toBeInTheDocument()
    await u.click(screen.getByRole("link", { name: /Se saken som saksbehandler/ }))

    expect(await screen.findByText(TYPED.email)).toBeInTheDocument()
    expect(screen.queryByText(DEMO_APPLICANT.organization ?? "—")).toBeNull()
  })
})
