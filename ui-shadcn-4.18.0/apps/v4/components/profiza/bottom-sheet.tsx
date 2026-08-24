"use client"

import * as React from "react"
import { X } from "lucide-react"

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  /** Heights as fraction of viewport, e.g. [0.4, 0.9] */
  snapPoints?: number[]
}

function haptic(type: "light" | "medium") {
  if (typeof navigator === "undefined") return
  navigator.vibrate?.(type === "light" ? 10 : 20)
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  snapPoints = [0.5, 0.92],
}: BottomSheetProps) {
  const [snapIndex, setSnapIndex] = React.useState(0)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const startY = React.useRef(0)
  const sheetRef = React.useRef<HTMLDivElement>(null)

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false

  // Reset snap on open
  React.useEffect(() => {
    if (open) {
      setSnapIndex(0)
      setDragOffset(0)
    }
  }, [open])

  // Keyboard: close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  const currentSnap = snapPoints[snapIndex]
  const sheetHeight = `${currentSnap * 100}vh`

  const handleDragStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragOffset(dy) // only drag down
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    const DISMISS_THRESHOLD = 120
    const SNAP_THRESHOLD = 60

    if (dragOffset > DISMISS_THRESHOLD) {
      if (snapIndex === 0) {
        haptic("medium")
        onOpenChange(false)
      } else {
        haptic("light")
        setSnapIndex(snapIndex - 1)
      }
    } else if (dragOffset < -SNAP_THRESHOLD && snapIndex < snapPoints.length - 1) {
      haptic("light")
      setSnapIndex(snapIndex + 1)
    }

    setDragOffset(0)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl"
        style={{
          height: sheetHeight,
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging || reducedMotion
            ? "none"
            : "height 0.3s cubic-bezier(0.32,0.72,0,1), transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {children}
        </div>

        {/* Safe area bottom */}
        <div className="safe-area-bottom shrink-0" />
      </div>
    </>
  )
}
