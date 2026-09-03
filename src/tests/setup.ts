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
  if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})
