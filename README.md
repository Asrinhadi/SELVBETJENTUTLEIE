# Kirkeutleie – digital forespørsel og intern saksflyt

Interaktiv frontend-prototype (fiktive data) som viser hvordan en forespørsel om leie av
kirke eller menighetslokale kan gå fra et offentlig skjema, via foreløpig pris og indikativ
tilgjengelighet, til en intern saksinnboks med behandling og automatiske oppgaver.

> Uavhengig prototype. Ikke tilknyttet et produksjonssystem. Ingen data sendes til
> Sarpsborg kirkelige fellesråd – alt lagres kun midlertidig i nettleseren.

## Kom i gang

```bash
npm install
npm run dev        # http://localhost:5173
```

Andre kommandoer:

```bash
npm test           # Vitest (pris, tilgjengelighet, skjema, saksflyt, UI)
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build      # produksjonsbygg til dist/
npm run preview    # forhåndsvis produksjonsbygget
```

## Ruter

| Rute                      | Innhold                                   |
| ------------------------- | ----------------------------------------- |
| `/`                       | Offentlig forespørselsskjema              |
| `/bekreftelse/:requestId` | Bekreftelse med referansenummer           |
| `/admin`                  | Intern saksinnboks                        |
| `/admin/saker/:requestId` | Valgt sak med behandling og oppgaver      |

`vercel.json` sender alle ruter til `index.html`, slik at React Router fungerer ved publisering.

## Arkitektur

```
src/
  domain/rental.ts          Typer og konstanter (bygg, formål, status, sak, oppgave)
  lib/pricing.ts            Prisregler som rene funksjoner
  lib/availability.ts       Indikativ tilgjengelighet (demo-regler)
  lib/caseflow.ts           Opprettelse, godkjenning, avslag, oppgaver, historikk
  lib/bookingSchema.ts      Zod-skjema for det offentlige skjemaet
  lib/formatters.ts         Formatering av beløp, dato og tid (nb)
  data/demoData.ts          Fiktive startsaker
  context/                  useReducer + Context + sessionStorage-persistens
  components/booking        Skjema og oppsummering
  components/caseflow       Innboks, saksdetaljer, behandling, historikk
  components/tasks          Oppgaveliste
  components/layout         Header, footer, sideoppsett
  components/ui             Tilpassede shadcn/ui-komponenter (Radix)
  assets/                   Headerbilde
  pages/                    Sidene som rutes
  tests/                    Vitest-tester
```

Tilstanden lever i `RentalProvider` (`useReducer` med typesikre actions) og speiles til
`sessionStorage`, slik at den overlever navigasjon og oppdatering av siden. «Nullstill demo»
gjenoppretter de fiktive startsakene.

## Hva er ekte og hva er simulert

**Ekte frontend-funksjonalitet:** skjemavalidering (React Hook Form + Zod), prisberegning,
tilgjengelighetsregler, opprettelse av saker med referansenummer, saksbehandling med
dialoger, automatisk opprettelse av oppgaver ved godkjenning, sakshistorikk, statistikk,
filtrering/søk og lagring i nettleseren.

**Simulert:** kalenderen (faste demo-regler), saksbehandlerrollen (ingen innlogging),
e-post/bekreftelse til søker (kun markert i historikken), kontrakt, faktura og nøkler
(oppgaver, ikke integrasjoner). Ingen data forlater nettleseren.
