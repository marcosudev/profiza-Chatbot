"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
}

function haptic(type: "light" | "success") {
  if (typeof navigator === "undefined") return
  navigator.vibrate?.(type === "light" ? 10 : [10, 50, 10])
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isPulling, setIsPulling] = React.useState(false)
  const startY = React.useRef(0)
  const triggered = React.useRef(false)

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || reducedMotion) return
    // Only activate when scrolled to top
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
    triggered.current = false
    setIsPulling(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing || reducedMotion) return
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) { setPullDistance(0); return }

    // Rubber-band resistance
    const resistance = 0.4
    const clamped = Math.min(dy * resistance, threshold * 1.5)
    setPullDistance(clamped)

    if (clamped >= threshold && !triggered.current) {
      haptic("light")
      triggered.current = true
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling || reducedMotion) return
    setIsPulling(false)

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold)
      haptic("success")
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        triggered.current = false
      }
    } else {
      setPullDistance(0)
    }
  }

  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 8 || isRefreshing

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-center"
        style={{
          height: showIndicator ? Math.max(pullDistance, isRefreshing ? threshold : 0) : 0,
          transition: isPulling ? "none" : "height 0.3s ease",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-md ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={{
            opacity: progress,
            transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 180}deg)`,
            transition: isPulling ? "none" : "all 0.3s ease",
          }}
        >
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${showIndicator ? Math.max(pullDistance, isRefreshing ? threshold : 0) : 0}px)`,
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {children}
      </div>
    </div>
  )
}
