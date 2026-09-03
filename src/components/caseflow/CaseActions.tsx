import { useId, useState } from "react"
import { CheckCircle2, MessageCircleQuestion, XCircle } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRental } from "@/context/useRental"
import type { RentalRequest } from "@/domain/rental"

type ActionKind = "approve" | "reject" | "info"

const MIN_MESSAGE_LENGTH = 10

interface CaseActionsProps {
  request: RentalRequest
}

export function CaseActions({ request }: CaseActionsProps) {
  const { approve, reject, requestInfo } = useRental()
  const [open, setOpen] = useState<ActionKind | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const textareaId = useId()

  const canAct = request.status === "new" || request.status === "needs_info"
  if (!canAct) return null

  function openDialog(kind: ActionKind) {
    setMessage("")
    setError(null)
    setOpen(kind)
  }

  function close() {
    setOpen(null)
  }

  function validateMessage(): string | null {
    const trimmed = message.trim()
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      setError(`Skriv minst ${MIN_MESSAGE_LENGTH} tegn.`)
      return null
    }
    return trimmed
  }

  function handleApprove() {
    approve(request.id)
    close()
    toast.success(`${request.reference} er godkjent`, {
      description: "Bekreftelse er opprettet og tre oppgaver er lagt til.",
    })
  }

  function handleReject() {
    const reason = validateMessage()
    if (!reason) return
    reject(request.id, reason)
    close()
    toast.error(`${request.reference} er avslått`, {
      description: "Begrunnelsen er lagt til i sakshistorikken.",
    })
  }

  function handleRequestInfo() {
    const text = validateMessage()
    if (!text) return
    requestInfo(request.id, text)
    close()
    toast.info(`Melding sendt for ${request.reference}`, {
      description: "Saken venter nå på svar fra søker.",
    })
  }

  return (
    <section aria-label="Behandle saken" className="flex flex-wrap gap-2.5">
      <Button variant="success" onClick={() => openDialog("approve")}>
        <CheckCircle2 aria-hidden="true" />
        Godkjenn
      </Button>
      <Button variant="warning" onClick={() => openDialog("info")}>
        <MessageCircleQuestion aria-hidden="true" />
        Be om mer informasjon
      </Button>
      <Button variant="destructive" onClick={() => openDialog("reject")}>
        <XCircle aria-hidden="true" />
        Avslå
      </Button>

      <Dialog open={open === "approve"} onOpenChange={(isOpen) => !isOpen && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Godkjenne {request.reference}?</DialogTitle>
            <DialogDescription>
              Når saken godkjennes, gjør systemet følgende automatisk:
            </DialogDescription>
          </DialogHeader>
          <ul className="glass-panel list-disc space-y-1 border-success-border/70 bg-success-soft/55 py-3.5 pr-4 pl-9 text-base">
            <li>Markerer at bekreftelse til søker er opprettet</li>
            <li>Oppretter oppgaven «Klargjør og send kontrakt»</li>
            <li>Oppretter oppgaven «Opprett fakturagrunnlag»</li>
            <li>Oppretter oppgaven «Avtal utlevering av nøkler»</li>
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button variant="default" onClick={handleApprove}>
              <CheckCircle2 aria-hidden="true" />
              Ja, godkjenn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "info"} onOpenChange={(isOpen) => !isOpen && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Be om mer informasjon</DialogTitle>
            <DialogDescription>
              Skriv en melding til {request.applicant.name}. Saken får status
              «Venter på svar» til søker har svart.
            </DialogDescription>
          </DialogHeader>
          <MessageField
            id={textareaId}
            label="Melding til søker"
            value={message}
            error={error}
            placeholder="F.eks. Kan du bekrefte antall deltakere og om dere trenger lydanlegg?"
            onChange={(value) => {
              setMessage(value)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button variant="default" onClick={handleRequestInfo}>
              <MessageCircleQuestion aria-hidden="true" />
              Send melding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "reject"} onOpenChange={(isOpen) => !isOpen && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avslå {request.reference}?</DialogTitle>
            <DialogDescription>
              Begrunnelsen legges i sakshistorikken og vil i en ekte løsning
              sendes til søker.
            </DialogDescription>
          </DialogHeader>
          <MessageField
            id={textareaId}
            label="Begrunnelse"
            value={message}
            error={error}
            placeholder="F.eks. Kirken er opptatt med gudstjeneste i det ønskede tidsrommet."
            onChange={(value) => {
              setMessage(value)
              if (error) setError(null)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Avbryt
            </Button>
            <Button variant="action" onClick={handleReject}>
              <XCircle aria-hidden="true" />
              Avslå forespørselen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

interface MessageFieldProps {
  id: string
  label: string
  value: string
  error: string | null
  placeholder: string
  onChange: (value: string) => void
}

function MessageField({ id, label, value, error, placeholder, onChange }: MessageFieldProps) {
  const errorId = `${id}-error`
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
