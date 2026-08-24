"use client"

import * as React from "react"

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  disabled?: boolean
}

const THRESHOLD = 72 // px to trigger action
const MAX_DRAG = 96  // px max visible drag

function haptic(type: "light" | "medium" | "success") {
  if (typeof navigator === "undefined") return
  const patterns = { light: [10], medium: [20], success: [10, 50, 10] }
  navigator.vibrate?.(patterns[type])
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  disabled = false,
}: SwipeableCardProps) {
  const [offset, setOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [triggered, setTriggered] = React.useState<"left" | "right" | null>(null)
  const startX = React.useRef(0)
  const startY = React.useRef(0)
  const isScrolling = React.useRef<boolean | null>(null)

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || reducedMotion) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isScrolling.current = null
    setIsDragging(false)
    setTriggered(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || reducedMotion) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine scroll vs swipe on first move
    if (isScrolling.current === null) {
      isScrolling.current = Math.abs(dy) > Math.abs(dx)
    }
    if (isScrolling.current) return

    e.preventDefault()
    setIsDragging(true)

    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx))
    setOffset(clamped)

    // Haptic at threshold
    if (Math.abs(clamped) >= THRESHOLD && triggered === null) {
      haptic("light")
      setTriggered(clamped < 0 ? "left" : "right")
    } else if (Math.abs(clamped) < THRESHOLD && triggered !== null) {
      setTriggered(null)
    }
  }

  const handleTouchEnd = () => {
    if (disabled || reducedMotion) return
    setIsDragging(false)

    if (offset <= -THRESHOLD && onSwipeLeft) {
      haptic("success")
      onSwipeLeft()
    } else if (offset >= THRESHOLD && onSwipeRight) {
      haptic("success")
      onSwipeRight()
    }

    setOffset(0)
    setTriggered(null)
    isScrolling.current = null
  }

  const showLeft = offset < -8 && !!leftAction
  const showRight = offset > 8 && !!rightAction
  const leftTriggered = triggered === "left"
  const rightTriggered = triggered === "right"

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left action reveal (swipe left) */}
      {leftAction && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-opacity ${
            showLeft ? "opacity-100" : "opacity-0"
          } ${leftTriggered ? "bg-destructive/20" : "bg-muted"}`}
          style={{ width: Math.abs(Math.min(offset, 0)) }}
        >
          {leftAction}
        </div>
      )}

      {/* Right action reveal (swipe right) */}
      {rightAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-opacity ${
            showRight ? "opacity-100" : "opacity-0"
          } ${rightTriggered ? "bg-primary/20" : "bg-muted"}`}
          style={{ width: Math.max(offset, 0) }}
        >
          {rightAction}
        </div>
      )}

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  )
}
