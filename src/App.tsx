import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { KirkeFlowProvider } from "@/context/KirkeFlowContext"
import { WizardPage } from "@/pages/WizardPage"

const CaseStatusPage = lazy(() =>
  import("@/pages/CaseStatusPage").then((m) => ({ default: m.CaseStatusPage })),
)
const AdminInboxPage = lazy(() =>
  import("@/pages/AdminInboxPage").then((m) => ({ default: m.AdminInboxPage })),
)
const AdminCasePage = lazy(() =>
  import("@/pages/AdminCasePage").then((m) => ({ default: m.AdminCasePage })),
)
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
)

function PageFallback() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground sm:px-6"
      role="status"
    >
      Laster …
    </div>
  )
}

/** Gamle lenker til en enkelt sak skal fortsatt lande riktig. */
function AdminRedirect() {
  const { caseId } = useParams()
  return <Navigate to={caseId ? `/saksbehandling/sak/${caseId}` : "/saksbehandling"} replace />
}

function StatusRedirect() {
  const { caseId } = useParams()
  return <Navigate to={caseId ? `/sak/${caseId}` : "/"} replace />
}

/** Rutene uten router – slik at tester kan bruke MemoryRouter. */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<WizardPage />} />
          <Route path="/sak/:caseId" element={<CaseStatusPage />} />
          <Route path="/saksbehandling" element={<AdminInboxPage />} />
          <Route path="/saksbehandling/sak/:caseId" element={<AdminCasePage />} />
          {/* Tidligere ruter fra utleiedemoen peker videre til de nye. */}
          <Route path="/admin" element={<Navigate to="/saksbehandling" replace />} />
          <Route path="/admin/saker/:caseId" element={<AdminRedirect />} />
          <Route path="/bekreftelse/:caseId" element={<StatusRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <KirkeFlowProvider>
        <AppRoutes />
        <Toaster />
      </KirkeFlowProvider>
    </BrowserRouter>
  )
}
