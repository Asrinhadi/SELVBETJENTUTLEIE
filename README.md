<div align="center">

# KirkeFlow

### Finn lokale, få pris, følg saken

En interaktiv frontend-prototype for utleieforespørsler og intern saksbehandling i et kirkelig fellesråd.

`React` · `TypeScript` · `Vite` · `Tailwind CSS` · `shadcn/ui` · `Zod` · `Vitest`

</div>

---

## Ideen

KirkeFlow selger ikke ledig kapasitet. Løsningen undersøker om et arrangement **passer**, hva det kan **koste**, og om det kan **godkjennes**.

Brukeren starter derfor med behovet sitt — ikke med å velge et tilfeldig lokale. «Ledig» betyr aldri «bekreftet»: en forespørsel kan kreve manuell vurdering, og det er saksbehandleren som avgjør.

## Flyten

**Offentlig del** — fem steg:

1. **Beskriv arrangementet** — type, beskrivelse, antall, dato, tid, klargjøring og rydding, behov
2. **Anbefalte lokaler** — regelbasert egnethetsmotor rangerer lokalene med forklaring
3. **Dato og tidspunkt** — indikativ tilgjengelighet, med klargjøring og rydding regnet inn
4. **Prisoverslag** — hver linje forklarer hva som er lagt til og hvorfor
5. **Send inn** — saksnummer, oppsummering og statustidslinje

**Intern del** — felles innboks med søk og filtre, og saksdetaljer med egnethetsvurdering, kalenderkontroll, prisberegning, kompleksitet, meldinger og revisjonslogg.

## Lokal utvikling

```bash
npm install
npm run dev
```

Applikasjonen åpnes på `http://localhost:5173`.

## Verifisering

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Ruter

| Rute                          | Innhold                     |
| ----------------------------- | --------------------------- |
| `/`                           | Veiviser i fem steg         |
| `/sak/:caseId`                | Søkerens statusside         |
| `/saksbehandling`             | Felles innboks              |
| `/saksbehandling/sak/:caseId` | Saksdetaljer med handlinger |

Tidligere ruter (`/admin`, `/admin/saker/:id`, `/bekreftelse/:id`) videresendes til de nye.

## Arkitektur

```
src/
  domain/
    venue.ts               Lokaler, typer, fasiliteter, satser
    event.ts               Arrangementstyper og behov
    case.ts                Saksmodell, statuser, hendelser, meldinger
    suitabilityEngine.ts   Regelbasert egnethetsvurdering
    availabilityEngine.ts  Indikativ tilgjengelighet mot demokalender
    pricingEngine.ts       Forklarbart prisoverslag
    complexity.ts          Kompleksitetsvurdering av saken
    caseflow.ts            Opprettelse og overganger
  data/                    Fiktive lokaler, saker, kalender og saksbehandlere
  context/                 useReducer + Context + localStorage
  components/              wizard, venue, case, forms, layout, ui
  pages/                   Veiviser, statusside, innboks, saksdetaljer
  tests/                   Vitest
```

Domenelogikken er rene funksjoner uten React-avhengigheter, og testes direkte.

## Avgrensning

Uavhengig prototype med fiktive data. Ingen backend, innlogging, database, betaling eller eksterne API-er. **Alle regler, terskler og priser er fiktive demoregler** laget for prototypen, og er ikke retningslinjene til Sarpsborg kirkelige fellesråd. Tilstanden lagres i nettleserens `localStorage` og kan tilbakestilles fra toppmenyen.
