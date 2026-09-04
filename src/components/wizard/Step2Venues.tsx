import { useMemo, useState } from "react"
import { Info } from "lucide-react"

import { VenueCard } from "@/components/venue/VenueCard"
import { WhyRecommended } from "@/components/venue/WhyRecommended"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import { assessAvailability } from "@/domain/availabilityEngine"
import type { EventNeeds } from "@/domain/event"
import { calculatePrice } from "@/domain/pricingEngine"
import { rankVenues, type SuitabilityResult } from "@/domain/suitabilityEngine"
import type { VenueId } from "@/domain/venue"
import { capitalize, formatLongDate, plural } from "@/lib/formatters"

interface Step2Props {
  needs: EventNeeds
  selectedVenueId: VenueId | null
  onSelect: (venueId: VenueId) => void
}

export function Step2Venues({ needs, selectedVenueId, onSelect }: Step2Props) {
  const { calendar } = useKirkeFlow()
  const [explaining, setExplaining] = useState<SuitabilityResult | null>(null)

  /**
   * Egnethet, ledighet og pris regnes ut for hvert lokale allerede her, slik at
   * brukeren slipper å velge i blinde og først oppdage «Opptatt» i neste steg.
   */
  const results = useMemo(() => {
    return rankVenues(needs).map((result) => ({
      result,
      availability: assessAvailability(needs, result.venueId, calendar),
      price: calculatePrice(needs, result.venueId),
    }))
  }, [needs, calendar])

  const suitable = results.filter((r) => r.result.verdict !== "ikke_egnet")
  const unsuitable = results.filter((r) => r.result.verdict === "ikke_egnet")

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Anbefalte lokaler</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <p className="text-base text-muted-foreground">
            Vi har sammenlignet behovene dine med {results.length} lokaler for{" "}
            {capitalize(formatLongDate(needs.date))}, kl. {needs.startTime}–{needs.endTime}.
            Hvert kort viser ledighet og foreløpig pris for akkurat dette tidspunktet.
          </p>
          <p className="glass-panel flex items-start gap-2 border-cream-border/80 bg-cream-soft/70 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Reglene i denne prototypen er fiktive demoregler, og er ikke retningslinjene til
            Sarpsborg kirkelige fellesråd. En anbefaling er ikke det samme som en bekreftet
            reservasjon.
          </p>
        </CardContent>
      </Card>

      {suitable.length === 0 ? (
        <p className="glass-card p-6 text-center text-muted-foreground">
          Ingen av lokalene dekker behovene slik de er beskrevet. Gå tilbake til steg 1 og
          juster antall personer eller behov, så prøver vi på nytt.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {suitable.map(({ result, availability, price }, index) => (
            <li key={result.venueId}>
              <VenueCard
                result={result}
                selected={result.venueId === selectedVenueId}
                isBest={index === 0 && result.verdict === "god_match"}
                availabilityState={availability.state}
                priceTotal={price.total}
                onSelect={onSelect}
                onExplain={setExplaining}
              />
            </li>
          ))}
        </ul>
      )}

      {unsuitable.length > 0 && (
        <details className="glass-card p-4 sm:p-5">
          <summary className="cursor-pointer text-base font-medium text-muted-foreground">
            Vis {plural(unsuitable.length, "lokale", "lokaler")} som ikke passer
          </summary>
          <ul className="flex flex-col gap-4 pt-4">
            {unsuitable.map(({ result, availability, price }) => (
              <li key={result.venueId}>
                <VenueCard
                  result={result}
                  selected={false}
                  availabilityState={availability.state}
                  priceTotal={price.total}
                  onSelect={onSelect}
                  onExplain={setExplaining}
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      <WhyRecommended
        result={explaining}
        onOpenChange={(open) => !open && setExplaining(null)}
      />
    </div>
  )
}
