import { useState } from "react"
import {
  BadgeCheck,
  CalendarX,
  CheckCircle2,
  CreditCard,
  MessageCircleQuestion,
  Repeat2,
  TriangleAlert,
  UserPlus,
  Wallet,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useKirkeFlow } from "@/context/useKirkeFlow"
import type { BookingRequest } from "@/domain/case"
import { hasCalendarConflict } from "@/domain/caseflow"
import { CURRENT_STAFF_ID, staffName } from "@/data/staff"
import { formatCurrency } from "@/lib/formatters"

type ActionKind =
  | "approve"
  | "override"
  | "reject"
  | "info"
  | "price"
  | "alternative"
  | "payment"

const MIN_TEXT = 10
const MAX_TEXT = 1000

export function CaseActions({ request }: { request: BookingRequest }) {
  const { assign, approve, reject, requestInfo, adjustPrice, proposeAlternative, confirmPayment } =
    useKirkeFlow()
  const [open, setOpen] = useState<ActionKind | null>(null)
  const [text, setText] = useState("")
  const [amount, setAmount] = useState("0")
  const [error, setError] = useState<string | null>(null)

  const decided = request.status === "avslatt" || request.status === "bekreftet"
  const canDecide = !decided && request.status !== "venter_betaling"
  const isMine = request.assignedTo === CURRENT_STAFF_ID
  const conflict = hasCalendarConflict(request)
  const conflictList = request.availability.conflicts
    .map((c) => `${c.title} (${c.timeRange})`)
    .join(", ")

  function openDialog(kind: ActionKind) {
    setText("")
    setAmount("0")
    setError(null)
    setOpen(kind)
  }

  function close() {
    setOpen(null)
  }

  function readText(): string | null {
    const trimmed = text.trim()
    if (trimmed.length < MIN_TEXT) {
      setError(`Skriv minst ${MIN_TEXT} tegn.`)
      return null
    }
    if (trimmed.length > MAX_TEXT) {
      setError(`Teksten kan være maks ${MAX_TEXT} tegn.`)
      return null
    }
    return trimmed
  }

  function handleAssign() {
    assign(request.id, CURRENT_STAFF_ID)
    toast.success("Saken er tildelt deg", {
      description: `${request.caseNumber} står nå på ${staffName(CURRENT_STAFF_ID)}.`,
    })
  }

  return (
    <section aria-label="Behandle saken" className="flex flex-col gap-3">
      {canDecide && conflict && (
        <p
          role="alert"
          className="glass-panel flex items-start gap-2.5 border-danger-border bg-danger-soft/70 p-3.5 text-base text-danger"
        >
          <CalendarX className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Kalenderkonflikt: lokalet er ikke ledig.</strong>{" "}
            {conflictList
              ? `Kolliderer med ${conflictList}.`
              : request.availability.reason}{" "}
            Vanlig godkjenning er sperret. Foreslå et annet tidspunkt, eller overstyr med
            skriftlig begrunnelse.
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {!isMine && !decided && (
          <Button variant="outline" onClick={handleAssign}>
            <UserPlus aria-hidden="true" />
            Tildel meg saken
          </Button>
        )}

        {canDecide && (
          <>
            {conflict ? (
              <Button variant="destructive" onClick={() => openDialog("override")}>
                <TriangleAlert aria-hidden="true" />
                Godkjenn likevel
              </Button>
            ) : (
              <Button variant="success" onClick={() => openDialog("approve")}>
                <CheckCircle2 aria-hidden="true" />
                Godkjenn
              </Button>
            )}
            <Button variant="warning" onClick={() => openDialog("info")}>
              <MessageCircleQuestion aria-hidden="true" />
              Be om mer informasjon
            </Button>
            <Button variant="outline" onClick={() => openDialog("price")}>
              <Wallet aria-hidden="true" />
              Juster prisoverslaget
            </Button>
            <Button variant="outline" onClick={() => openDialog("alternative")}>
              <Repeat2 aria-hidden="true" />
              Foreslå alternativ
            </Button>
            <Button variant="destructive" onClick={() => openDialog("reject")}>
              <XCircle aria-hidden="true" />
              Avslå
            </Button>
          </>
        )}

        {request.status === "venter_betaling" && (
          <Button variant="success" onClick={() => openDialog("payment")}>
            <CreditCard aria-hidden="true" />
            Registrer betaling
          </Button>
        )}
      </div>

      {/* Godkjenn til tross for konflikt – krever begrunnelse, og logges */}
      <Dialog open={open === "override"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Godkjenne {request.caseNumber} med kalenderkonflikt?</DialogTitle>
            <DialogDescription>
              Lokalet er registrert som opptatt i tidsrommet. Godkjenner du nå, kan det
              oppstå dobbeltbooking.
            </DialogDescription>
          </DialogHeader>
          <div className="glass-panel border-danger-border bg-danger-soft/60 p-3 text-sm text-danger">
            <p className="font-semibold">Konflikt i kalenderen:</p>
            <p>{conflictList || request.availability.reason}</p>
          </div>
          <MessageField
            label="Begrunnelse for overstyring"
            value={text}
            error={error}
            placeholder="For eksempel: den andre oppføringen er avlyst og fjernes fra kalenderen i dag."
            onChange={(v) => {
              setText(v)
              if (error) setError(null)
            }}
          />
          <p className="text-sm text-muted-foreground">
            Begrunnelsen føres i revisjonsloggen sammen med hvem som overstyrte.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="action"
              onClick={() => {
                const reason = readText()
                if (!reason) return
                approve(request.id, reason)
                close()
                toast.warning(`${request.caseNumber} er godkjent med overstyrt konflikt`, {
                  description: "Overstyringen er ført i revisjonsloggen.",
                })
              }}
            >
              <TriangleAlert aria-hidden="true" />
              Overstyr og godkjenn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Godkjenn */}
      <Dialog open={open === "approve"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Godkjenne {request.caseNumber}?</DialogTitle>
            <DialogDescription>
              Søker får bekreftelse, og saken går videre til betaling.
            </DialogDescription>
          </DialogHeader>
          <ul className="glass-panel list-disc space-y-1 border-success-border/70 bg-success-soft/55 py-3.5 pr-4 pl-9 text-base">
            <li>Status settes til godkjent</li>
            <li>Fakturagrunnlag opprettes automatisk</li>
            <li>Foreløpig sum: {formatCurrency(request.price.total)}</li>
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="default"
              onClick={() => {
                approve(request.id)
                close()
                toast.success(`${request.caseNumber} er godkjent`, {
                  description: "Saken venter nå på betaling.",
                })
              }}
            >
              <CheckCircle2 aria-hidden="true" />
              Ja, godkjenn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Be om mer informasjon */}
      <Dialog open={open === "info"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Be om mer informasjon</DialogTitle>
            <DialogDescription>
              Meldingen sendes til {request.applicant.name}, og saken settes til «Venter på
              søker».
            </DialogDescription>
          </DialogHeader>
          {request.missingInfo.length > 0 && (
            <div className="glass-panel border-warning-border bg-warning-soft/60 p-3 text-sm">
              <p className="font-semibold text-warning">Automatisk kontroll savner:</p>
              <ul className="list-disc pl-5">
                {request.missingInfo.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <MessageField
            label="Melding til søker"
            value={text}
            error={error}
            placeholder="Hva trenger du å vite for å kunne avgjøre saken?"
            onChange={(v) => {
              setText(v)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const body = readText()
                if (!body) return
                requestInfo(request.id, body)
                close()
                toast.info(`Melding sendt for ${request.caseNumber}`)
              }}
            >
              Send melding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Juster pris */}
      <Dialog open={open === "price"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Juster prisoverslaget</DialogTitle>
            <DialogDescription>
              Justeringen legges til som en egen linje i overslaget. Bruk minus for avslag.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="justering">Beløp i kroner</Label>
            <Input
              id="justering"
              inputMode="numeric"
              maxLength={12}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <MessageField
            label="Begrunnelse"
            value={text}
            error={error}
            placeholder="For eksempel: menighetsrabatt etter avtale med kirkevergen."
            onChange={(v) => {
              setText(v)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const parsed = Number(amount.replace(/\s/g, "").replace(",", "."))
                if (!Number.isFinite(parsed) || parsed === 0) {
                  setError("Oppgi et beløp forskjellig fra 0.")
                  return
                }
                if (Math.abs(parsed) > 1_000_000) {
                  setError("Beløpet er urimelig høyt.")
                  return
                }
                const reason = readText()
                if (!reason) return
                adjustPrice(request.id, parsed, reason)
                close()
                toast.success("Prisoverslaget er justert")
              }}
            >
              Lagre justering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Foreslå alternativ */}
      <Dialog open={open === "alternative"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foreslå annet lokale eller tidspunkt</DialogTitle>
            <DialogDescription>
              Forslaget sendes som melding til søker og legges i historikken.
            </DialogDescription>
          </DialogHeader>
          <MessageField
            label="Forslag"
            value={text}
            error={error}
            placeholder="For eksempel: Greåker menighetshus er ledig samme kveld og har scene og lydanlegg."
            onChange={(v) => {
              setText(v)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const body = readText()
                if (!body) return
                proposeAlternative(request.id, body)
                close()
                toast.success("Forslaget er sendt")
              }}
            >
              Send forslag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avslå */}
      <Dialog open={open === "reject"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avslå {request.caseNumber}?</DialogTitle>
            <DialogDescription>
              Begrunnelsen legges i historikken og sendes til søker. Saken kan ikke behandles
              videre etterpå.
            </DialogDescription>
          </DialogHeader>
          <MessageField
            label="Begrunnelse"
            value={text}
            error={error}
            placeholder="Forklar hvorfor forespørselen ikke kan innvilges."
            onChange={(v) => {
              setText(v)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="action"
              onClick={() => {
                const reason = readText()
                if (!reason) return
                reject(request.id, reason)
                close()
                toast.error(`${request.caseNumber} er avslått`)
              }}
            >
              <XCircle aria-hidden="true" />
              Avslå forespørselen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrer betaling */}
      <Dialog open={open === "payment"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrere betaling?</DialogTitle>
            <DialogDescription>
              Reservasjonen bekreftes og saken avsluttes. Beløp: {formatCurrency(request.price.total)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button
              variant="default"
              onClick={() => {
                confirmPayment(request.id)
                close()
                toast.success("Reservasjonen er bekreftet")
              }}
            >
              <BadgeCheck aria-hidden="true" />
              Bekreft reservasjon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function MessageField({
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  error: string | null
  placeholder: string
  onChange: (value: string) => void
}) {
  const id = `felt-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        <span className="text-action" aria-hidden="true">
          *
        </span>
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={MAX_TEXT}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
