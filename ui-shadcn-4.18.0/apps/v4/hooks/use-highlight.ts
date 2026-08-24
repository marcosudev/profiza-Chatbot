"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

/**
 * Reads ?highlight=<id> from the URL, scrolls to the element with
 * data-highlight-id="<id>", and returns the highlighted id so rows
 * can apply a visual ring.
 *
 * The highlight clears after 3 seconds.
 */
export function useHighlight() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!highlightId) return

    setActiveId(highlightId)

    // Wait for the DOM to settle (pagination / filter effects)
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-highlight-id="${highlightId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 150)

    // Clear highlight after 3s
    const clear = setTimeout(() => setActiveId(null), 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(clear)
    }
  }, [highlightId])

  return activeId
}
