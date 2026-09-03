/** Aria-attributter som knytter en skjemakontroll til hint- og feiltekst. */
export function fieldA11y(
  id: string,
  options: { error?: string; hint?: string; required?: boolean } = {},
) {
  const describedBy = [
    options.hint ? `${id}-hint` : null,
    options.error ? `${id}-error` : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" ")

  return {
    id,
    "aria-invalid": options.error ? true : undefined,
    "aria-describedby": describedBy.length > 0 ? describedBy : undefined,
    "aria-required": options.required === false ? undefined : true,
  }
}
