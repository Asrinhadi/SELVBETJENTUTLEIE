import { addDays, subDays } from "date-fns"

import type { CalendarBooking } from "@/domain/availabilityEngine"
import type { BookingRequest } from "@/domain/case"
import { approveCase, assignCase, createCase, rejectCase, requestMoreInfo } from "@/domain/caseflow"
import type { EventNeeds } from "@/domain/event"
import type { VenueId } from "@/domain/venue"
import { toIsoDate } from "@/lib/dates"
import { STAFF } from "@/data/staff"

/**
 * Fiktive saker som demoen starter med. Alle navn og kontaktopplysninger er
 * oppdiktet, og sakene bygges med de samme motorene som ekte forespørsler.
 */
export const DEMO_START_SEQUENCE = 142

interface DemoSeed {
  needs: EventNeeds
  venueId: VenueId
  applicant: BookingRequest["applicant"]
  createdOffsetDays: number
  action?: "assign" | "approve" | "reject" | "info"
}

function seeds(today: Date): DemoSeed[] {
  const day = (offset: number) => toIsoDate(addDays(today, offset))

  return [
    {
      needs: {
        eventType: "konsert",
        description:
          "Alkoholfri adventskonsert med kammerkor og strykekvartett. Publikum sitter, og vi trenger piano og god adkomst for eldre.",
        expectedAttendees: 150,
        date: day(28),
        startTime: "18:00",
        endTime: "20:00",
        setupMinutes: 60,
        cleanupMinutes: 30,
        requiredFacilities: ["piano", "universell_adkomst"],
        otherNeeds: "Ønsker tilgang til sakristi som garderobe.",
        amplifiedMusic: false,
        ticketed: true,
        needsStage: false,
        publicEvent: true,
      },
      venueId: "sarpsborg-kirke",
      applicant: {
        name: "Ingrid Solberg",
        organization: "Sarpsborg kammerkor",
        email: "ingrid.solberg@example.org",
        phone: "917 45 210",
      },
      createdOffsetDays: -2,
    },
    {
      needs: {
        eventType: "selskap",
        description:
          "Konfirmasjonsselskap for familie og venner. Vi tar med egen mat og trenger kjøkken til servering og oppvask.",
        expectedAttendees: 45,
        date: day(35),
        startTime: "13:00",
        endTime: "18:00",
        setupMinutes: 60,
        cleanupMinutes: 60,
        requiredFacilities: ["kjokken", "universell_adkomst", "lydanlegg"],
        otherNeeds: "Trenger bord til 45 personer.",
        servingFood: true,
        servingAlcohol: false,
        amplifiedMusic: false,
      },
      venueId: "greaker-menighetshus",
      applicant: {
        name: "Jonas Halvorsen",
        email: "jonas.halvorsen@example.net",
        phone: "402 18 776",
      },
      createdOffsetDays: -5,
      action: "info",
    },
    {
      needs: {
        eventType: "ovelse",
        description:
          "Ukentlig korøvelse fram mot vårkonserten. Ingen publikum, kun kor og dirigent.",
        expectedAttendees: 28,
        date: day(9),
        startTime: "19:00",
        endTime: "21:00",
        setupMinutes: 15,
        cleanupMinutes: 15,
        requiredFacilities: ["piano"],
        otherNeeds: "",
      },
      venueId: "kurland-menighetssenter",
      applicant: {
        name: "Marte Eide",
        organization: "Tune ungdomskor",
        email: "marte.eide@example.com",
        phone: "958 33 104",
      },
      createdOffsetDays: -8,
      action: "approve",
    },
    {
      needs: {
        eventType: "kulturarrangement",
        description:
          "Foredrag med lysbilder om lokalhistorie, etterfulgt av enkel samtale. Åpent for alle.",
        expectedAttendees: 90,
        date: day(14),
        startTime: "18:00",
        endTime: "20:30",
        setupMinutes: 45,
        cleanupMinutes: 30,
        requiredFacilities: ["projektor", "lydanlegg", "universell_adkomst"],
        otherNeeds: "Trenger mulighet for å mørklegge salen.",
        amplifiedMusic: true,
        ticketed: false,
        needsStage: false,
        publicEvent: true,
      },
      venueId: "greaker-menighetshus",
      applicant: {
        name: "Per Kristian Lunde",
        organization: "Sarpsborg historielag",
        email: "pk.lunde@example.org",
        phone: "926 70 431",
      },
      createdOffsetDays: -3,
      action: "assign",
    },
    {
      needs: {
        eventType: "mote",
        description: "Styremøte i menighetsrådet.",
        expectedAttendees: 12,
        date: day(4),
        startTime: "18:00",
        endTime: "20:00",
        setupMinutes: 0,
        cleanupMinutes: 15,
        requiredFacilities: ["projektor"],
        otherNeeds: "",
      },
      venueId: "kurland-moterom",
      applicant: {
        name: "Solveig Aas",
        organization: "Kurland menighetsråd",
        email: "solveig.aas@example.org",
        phone: "481 20 933",
      },
      createdOffsetDays: -1,
    },
    {
      needs: {
        eventType: "konsert",
        description:
          "Rockekonsert med forsterket band og lysshow. Billettsalg ved inngangen.",
        expectedAttendees: 260,
        date: day(30),
        startTime: "20:00",
        endTime: "23:00",
        setupMinutes: 120,
        cleanupMinutes: 60,
        requiredFacilities: ["lydanlegg", "scene", "universell_adkomst"],
        otherNeeds: "Trenger strøm til 16A og plass til lysrigg.",
        amplifiedMusic: true,
        ticketed: true,
        needsStage: true,
        publicEvent: true,
      },
      venueId: "tune-kirke",
      applicant: {
        name: "Even Bakke",
        organization: "Østfold Live",
        email: "even.bakke@example.com",
        phone: "934 55 128",
      },
      createdOffsetDays: -6,
      action: "reject",
    },
  ]
}

export function buildDemoCases(
  today: Date,
  calendar: readonly CalendarBooking[],
): BookingRequest[] {
  const staffOne = STAFF[0]
  const staffTwo = STAFF[1]

  return seeds(today).map((seed, index) => {
    const createdAt = subDays(today, Math.abs(seed.createdOffsetDays))
    let request = createCase(
      { needs: seed.needs, venueId: seed.venueId, applicant: seed.applicant, calendar },
      DEMO_START_SEQUENCE + index,
      createdAt,
    )

    const actedAt = addDays(createdAt, 1)
    switch (seed.action) {
      case "assign":
        if (staffOne) request = assignCase(request, staffOne.id, staffOne.name, actedAt)
        break
      case "approve":
        if (staffOne) {
          request = assignCase(request, staffOne.id, staffOne.name, actedAt)
          request = approveCase(request, staffOne.name, actedAt)
        }
        break
      case "reject":
        if (staffTwo) {
          request = assignCase(request, staffTwo.id, staffTwo.name, actedAt)
          request = rejectCase(
            request,
            "Forsterket rockekonsert med billettsalg er ikke forenlig med bruken av kirkerommet. Vi foreslår Greåker menighetshus som alternativ.",
            staffTwo.name,
            actedAt,
          )
        }
        break
      case "info":
        if (staffOne) {
          request = assignCase(request, staffOne.id, staffOne.name, actedAt)
          request = requestMoreInfo(
            request,
            "Hei! Kan du bekrefte om dere trenger bord og stoler til alle 45, og om dere ønsker tilgang til storkjøkkenet eller bare tekjøkkenet? Da får vi satt opp riktig pris.",
            staffOne.name,
            actedAt,
          )
        }
        break
      default:
        break
    }

    return request
  })
}
