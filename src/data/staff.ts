import type { StaffMember } from "@/domain/case"

/** Fiktive saksbehandlere. Ingen reelle personopplysninger. */
export const STAFF: readonly StaffMember[] = [
  { id: "sb-1", name: "Anne Lie", role: "Saksbehandler", initials: "AL" },
  { id: "sb-2", name: "Bjørn Rud", role: "Kirkeverge", initials: "BR" },
  { id: "sb-3", name: "Kari Vold", role: "Kirketjener", initials: "KV" },
]

/** Innlogget demobruker på saksbehandlersiden. */
export const CURRENT_STAFF_ID = "sb-1"

export function getStaff(id: string | null): StaffMember | null {
  if (!id) return null
  return STAFF.find((s) => s.id === id) ?? null
}

export function staffName(id: string | null): string {
  return getStaff(id)?.name ?? "Ikke tildelt"
}
