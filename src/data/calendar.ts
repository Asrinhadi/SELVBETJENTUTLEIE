import { addDays } from "date-fns"

import type { CalendarBooking } from "@/domain/availabilityEngine"
import { toIsoDate } from "@/lib/dates"

/**
 * Fiktiv demokalender. Oppføringene lages relativt til dagens dato slik at
 * demoen alltid har realistiske konflikter, uansett når den kjøres.
 */
export function buildDemoCalendar(today: Date): readonly CalendarBooking[] {
  const day = (offset: number) => toIsoDate(addDays(today, offset))

  return [
    // Faste gudstjenester kommende søndager
    ...sundayServices(today),

    // Konflikter som gjør demoen interessant
    {
      id: "cal-1",
      venueId: "sarpsborg-kirke",
      date: day(14),
      start: "17:00",
      end: "21:00",
      title: "Julekonsert med Sarpsborg kammerkor",
      kind: "bekreftet",
    },
    {
      id: "cal-2",
      venueId: "sarpsborg-kirke",
      date: day(21),
      start: "11:00",
      end: "13:00",
      title: "Vielse",
      kind: "bekreftet",
    },
    {
      id: "cal-3",
      venueId: "tune-kirke",
      date: day(14),
      start: "19:30",
      end: "21:30",
      title: "Korøvelse",
      kind: "forelopig",
    },
    {
      id: "cal-4",
      venueId: "greaker-menighetshus",
      date: day(14),
      start: "12:00",
      end: "16:00",
      title: "Konfirmantsamling",
      kind: "bekreftet",
    },
    {
      id: "cal-5",
      venueId: "hafslund-menighetssal",
      date: day(7),
      start: "13:00",
      end: "16:00",
      title: "Minnesamvær",
      kind: "bekreftet",
    },
    {
      id: "cal-6",
      venueId: "kurland-menighetssenter",
      date: day(14),
      start: "18:00",
      end: "20:00",
      title: "Menighetsrådsmøte",
      kind: "forelopig",
    },
    {
      id: "cal-7",
      venueId: "skjeberg-kirke",
      date: day(10),
      start: "18:00",
      end: "20:00",
      title: "Orgelvedlikehold",
      kind: "bekreftet",
    },
    {
      id: "cal-8",
      venueId: "greaker-menighetshus",
      date: day(21),
      start: "10:00",
      end: "14:00",
      title: "Kurs i sorgarbeid",
      kind: "bekreftet",
    },
  ]
}

/** Gudstjeneste kl. 11–12.30 de neste åtte søndagene i begge hovedkirkene. */
function sundayServices(today: Date): CalendarBooking[] {
  const bookings: CalendarBooking[] = []
  let found = 0
  for (let offset = 0; offset <= 60 && found < 8; offset += 1) {
    const date = addDays(today, offset)
    if (date.getDay() !== 0) continue
    found += 1
    const iso = toIsoDate(date)
    bookings.push({
      id: `gudstjeneste-sarpsborg-${iso}`,
      venueId: "sarpsborg-kirke",
      date: iso,
      start: "11:00",
      end: "12:30",
      title: "Høymesse",
      kind: "gudstjeneste",
    })
    bookings.push({
      id: `gudstjeneste-tune-${iso}`,
      venueId: "tune-kirke",
      date: iso,
      start: "11:00",
      end: "12:30",
      title: "Høymesse",
      kind: "gudstjeneste",
    })
  }
  return bookings
}
