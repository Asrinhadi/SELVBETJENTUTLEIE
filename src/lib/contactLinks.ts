/**
 * Bygger «mailto:»- og «tel:»-lenker fra kontaktopplysninger.
 *
 * Opplysningene kan komme fra lagret tilstand, som brukeren selv kan endre i
 * nettleseren. Uten kontroll kan en e-postadresse som «ok@example.no?bcc=…&subject=…»
 * smugle inn ekstra mailto-parametere og forhåndsutfylle blindkopi eller emne
 * i mottakerens e-postklient. Verdier som ikke har gyldig form får derfor
 * ingen lenke – de vises som ren tekst i stedet.
 */

const EMAIL_PATTERN = /^[^\s@?&#/\\;,]+@[^\s@?&#/\\;,]+\.[a-z]{2,}$/i
const PHONE_PATTERN = /^\+?[\d\s()-]{8,20}$/

export function mailtoHref(email: string): string | null {
  const trimmed = email.trim()
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) return null
  return `mailto:${encodeURIComponent(trimmed)}`
}

export function telHref(phone: string): string | null {
  const trimmed = phone.trim()
  if (!PHONE_PATTERN.test(trimmed)) return null
  const digits = trimmed.replace(/[\s()-]/g, "")
  return `tel:${digits}`
}
