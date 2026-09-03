import { PriceBreakdown } from "@/components/case/PriceBreakdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PriceEstimate } from "@/domain/pricingEngine"
import { getVenue, type VenueId } from "@/domain/venue"

export function Step4Price({
  estimate,
  venueId,
}: {
  estimate: PriceEstimate
  venueId: VenueId
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prisoverslag for {getVenue(venueId).name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-muted-foreground">
          Hver linje viser hva som er lagt til og hvorfor. Ingenting er bindende før
          forespørselen er behandlet.
        </p>
        <PriceBreakdown estimate={estimate} />
      </CardContent>
    </Card>
  )
}
