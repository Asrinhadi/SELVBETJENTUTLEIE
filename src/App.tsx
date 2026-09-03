import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { RentalProvider } from "@/context/RentalContext"
import { BookingPage } from "@/pages/BookingPage"

const ConfirmationPage = lazy(() =>
  import("@/pages/ConfirmationPage").then((m) => ({ default: m.ConfirmationPage })),
)
const AdminInboxPage = lazy(() =>
  import("@/pages/AdminInboxPage").then((m) => ({ default: m.AdminInboxPage })),
)
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
)

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground sm:px-6" role="status">
      Laster …
    </div>
  )
}

/** Rutene uten router – slik at tester kan bruke MemoryRouter. */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<BookingPage />} />
          <Route path="/bekreftelse/:requestId" element={<ConfirmationPage />} />
          <Route path="/admin" element={<AdminInboxPage />} />
          <Route path="/admin/saker/:requestId" element={<AdminInboxPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RentalProvider>
        <AppRoutes />
        <Toaster />
      </RentalProvider>
    </BrowserRouter>
  )
}
