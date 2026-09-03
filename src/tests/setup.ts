import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll } from "vitest"

/** jsdom mangler ResizeObserver, som Radix-primitivene bruker. */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = ResizeObserverStub
  }

  // Radix Select bruker pointer capture og scrollIntoView, som jsdom ikke implementerer.
  const elementPrototype = window.HTMLElement.prototype
  if (typeof elementPrototype.scrollIntoView !== "function") {
    elementPrototype.scrollIntoView = () => {}
  }
  if (typeof elementPrototype.hasPointerCapture !== "function") {
    elementPrototype.hasPointerCapture = () => false
  }
  if (typeof elementPrototype.setPointerCapture !== "function") {
    elementPrototype.setPointerCapture = () => {}
  }
  if (typeof elementPrototype.releasePointerCapture !== "function") {
    elementPrototype.releasePointerCapture = () => {}
  }
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})
