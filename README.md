<div align="center">

# Kirkeutleie

### Digital forespørsel og intern saksflyt

En interaktiv frontend-prototype som demonstrerer hele prosessen fra forespørsel og prisestimat til intern behandling og oppfølging.

`React` · `TypeScript` · `Vite` · `Tailwind CSS` · `shadcn/ui` · `Zod` · `Vitest`

</div>

---

## Løsningen

Brukeren velger lokale, dato, tidspunkt og formål. Systemet viser indikativ tilgjengelighet og beregner en foreløpig pris før forespørselen sendes inn.

På administrasjonssiden kan forespørselen behandles, godkjennes eller avslås. Løsningen oppretter sakshistorikk og tilhørende oppgaver automatisk.

## Lokal utvikling

```bash
npm install
npm run dev
```

## Verifisering

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Avgrensning

Dette er en uavhengig prototype med fiktive data. Løsningen har ingen backend, innlogging eller eksterne integrasjoner. All informasjon lagres midlertidig i nettleserens `sessionStorage`.
