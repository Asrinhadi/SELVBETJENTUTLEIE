import { Link } from "react-router-dom"
import { Inbox, PenLine } from "lucide-react"

import { PageHeading } from "@/components/layout/PageHeading"
import { Button } from "@/components/ui/button"
import { usePageTitle } from "@/lib/usePageTitle"

export function NotFoundPage() {
  usePageTitle("Siden finnes ikke")

  return (
    <div className="animate-rise mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeading
        title="Siden finnes ikke"
        description="Adressen du gikk til finnes ikke i prototypen."
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="action" asChild>
          <Link to="/">
            <PenLine aria-hidden="true" />
            Send ny forespørsel
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin">
            <Inbox aria-hidden="true" />
            Intern innboks
          </Link>
        </Button>
      </div>
    </div>
  )
}
