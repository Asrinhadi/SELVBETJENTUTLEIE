/**
 * Lokaler i KirkeFlow. Alle data er fiktive demodata.
 */

export const VENUE_IDS = [
  "sarpsborg-kirke",
  "tune-kirke",
  "skjeberg-kirke",
  "greaker-menighetshus",
  "hafslund-menighetssal",
  "kurland-menighetssenter",
  "kurland-moterom",
] as const

export type VenueId = (typeof VENUE_IDS)[number]

export type VenueType =
  | "kirke"
  | "kapell"
  | "menighetshus"
  | "menighetssal"
  | "moterom"

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  kirke: "Kirke",
  kapell: "Kapell",
  menighetshus: "Menighetshus",
  menighetssal: "Menighetssal",
  moterom: "Møterom",
}

export const FACILITY_IDS = [
  "piano",
  "orgel",
  "lydanlegg",
  "projektor",
  "kjokken",
  "universell_adkomst",
  "scene",
  "teleslynge",
] as const

export type FacilityId = (typeof FACILITY_IDS)[number]

export const FACILITY_LABELS: Record<FacilityId, string> = {
  piano: "Piano",
  orgel: "Orgel",
  lydanlegg: "Lydanlegg",
  projektor: "Projektor",
  kjokken: "Kjøkken",
  universell_adkomst: "Universell adkomst",
  scene: "Scene",
  teleslynge: "Teleslynge",
}

/** Prisgruppe fra fellesrådets fiktive prisliste. */
export type PriceGroup = "I" | "II"

export interface Venue {
  id: VenueId
  name: string
  type: VenueType
  priceGroup: PriceGroup
  /** Kort beskrivelse til lokalkortet. */
  description: string
  address: string
  /** Antall sitteplasser ved normal oppstilling. */
  seatedCapacity: number
  /** Maksimalt antall personer, inkludert ståplass. */
  maxCapacity: number
  facilities: readonly FacilityId[]
  /** Kirkerom har egne hensyn for bruk og lydnivå. */
  isSacredSpace: boolean
  /** Om forsterket musikk normalt er greit uten egen vurdering. */
  allowsAmplifiedMusic: boolean
  /** Om servering av mat er en vanlig bruk av lokalet. */
  allowsFoodService: boolean
  /** Over dette deltakerantallet kreves ekstra bemanning. */
  staffRequiredAbove: number
  /** Fiktive satser, kroner. */
  hourlyRate: number
  baseRate: number
  cleaningFee: number
}

export const VENUES: readonly Venue[] = [
  {
    id: "sarpsborg-kirke",
    name: "Sarpsborg kirke",
    type: "kirke",
    priceGroup: "I",
    description:
      "Hovedkirken med god akustikk og orgel. Egnet for konserter og større kirkelige handlinger.",
    address: "Kirkegata 1, Sarpsborg",
    seatedCapacity: 450,
    maxCapacity: 520,
    facilities: ["piano", "orgel", "lydanlegg", "universell_adkomst", "teleslynge"],
    isSacredSpace: true,
    allowsAmplifiedMusic: false,
    allowsFoodService: false,
    staffRequiredAbove: 200,
    hourlyRate: 1250,
    baseRate: 2400,
    cleaningFee: 1600,
  },
  {
    id: "tune-kirke",
    name: "Tune kirke",
    type: "kirke",
    priceGroup: "I",
    description:
      "Middelalderkirke med varm akustikk. Passer godt for kor, kammermusikk og vielser.",
    address: "Tuneveien 40, Sarpsborg",
    seatedCapacity: 300,
    maxCapacity: 340,
    facilities: ["piano", "orgel", "universell_adkomst", "teleslynge"],
    isSacredSpace: true,
    allowsAmplifiedMusic: false,
    allowsFoodService: false,
    staffRequiredAbove: 150,
    hourlyRate: 1100,
    baseRate: 2200,
    cleaningFee: 1400,
  },
  {
    id: "skjeberg-kirke",
    name: "Skjeberg kirke",
    type: "kirke",
    priceGroup: "I",
    description:
      "Steinkirke med tradisjonell innredning. Trapp ved hovedinngangen begrenser adkomsten.",
    address: "Skjebergdalen 12, Sarpsborg",
    seatedCapacity: 250,
    maxCapacity: 280,
    facilities: ["orgel", "teleslynge"],
    isSacredSpace: true,
    allowsAmplifiedMusic: false,
    allowsFoodService: false,
    staffRequiredAbove: 150,
    hourlyRate: 1000,
    baseRate: 2000,
    cleaningFee: 1300,
  },
  {
    id: "greaker-menighetshus",
    name: "Greåker menighetshus",
    type: "menighetshus",
    priceGroup: "II",
    description:
      "Fleksibel storsal med scene og fullt utstyrt kjøkken. Egnet for kurs, selskap og kulturarrangement.",
    address: "Storveien 8, Greåker",
    seatedCapacity: 120,
    maxCapacity: 160,
    facilities: [
      "piano",
      "lydanlegg",
      "projektor",
      "kjokken",
      "universell_adkomst",
      "scene",
    ],
    isSacredSpace: false,
    allowsAmplifiedMusic: true,
    allowsFoodService: true,
    staffRequiredAbove: 120,
    hourlyRate: 650,
    baseRate: 1200,
    cleaningFee: 900,
  },
  {
    id: "hafslund-menighetssal",
    name: "Hafslund menighetssal",
    type: "menighetssal",
    priceGroup: "II",
    description:
      "Lys sal i tilknytning til kirken, med tekjøkken. Mye brukt til minnesamvær og mindre selskap.",
    address: "Hafslundsøy 3, Sarpsborg",
    seatedCapacity: 80,
    maxCapacity: 100,
    facilities: ["piano", "kjokken", "universell_adkomst", "lydanlegg"],
    isSacredSpace: false,
    allowsAmplifiedMusic: true,
    allowsFoodService: true,
    staffRequiredAbove: 90,
    hourlyRate: 480,
    baseRate: 950,
    cleaningFee: 700,
  },
  {
    id: "kurland-menighetssenter",
    name: "Kurland menighetssenter",
    type: "menighetssal",
    priceGroup: "II",
    description:
      "Moderne sal med projektor og lydanlegg. Godt egnet for kurs, møter og øvelser.",
    address: "Kurlandveien 22, Sarpsborg",
    seatedCapacity: 60,
    maxCapacity: 75,
    facilities: ["projektor", "lydanlegg", "kjokken", "universell_adkomst"],
    isSacredSpace: false,
    allowsAmplifiedMusic: true,
    allowsFoodService: true,
    staffRequiredAbove: 70,
    hourlyRate: 390,
    baseRate: 750,
    cleaningFee: 550,
  },
  {
    id: "kurland-moterom",
    name: "Kurland møterom",
    type: "moterom",
    priceGroup: "II",
    description:
      "Lite møterom med projektor. Passer for styremøter, samtaler og små arbeidsgrupper.",
    address: "Kurlandveien 22, Sarpsborg",
    seatedCapacity: 14,
    maxCapacity: 18,
    facilities: ["projektor", "universell_adkomst"],
    isSacredSpace: false,
    allowsAmplifiedMusic: false,
    allowsFoodService: false,
    staffRequiredAbove: 100,
    hourlyRate: 220,
    baseRate: 400,
    cleaningFee: 250,
  },
]

export function getVenue(id: VenueId): Venue {
  const venue = VENUES.find((v) => v.id === id)
  if (!venue) throw new Error(`Ukjent lokale: ${id}`)
  return venue
}

export function isVenueId(value: string): value is VenueId {
  return (VENUE_IDS as readonly string[]).includes(value)
}
