"use client"

import * as React from "react"

interface KpiCarouselProps {
  children: React.ReactNode[]
  className?: string
}

export function KpiCarousel({ children, className = "" }: KpiCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const itemWidth = el.scrollWidth / children.length
    const index = Math.round(el.scrollLeft / itemWidth)
    setActiveIndex(Math.max(0, Math.min(index, children.length - 1)))
  }

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    const itemWidth = el.scrollWidth / children.length
    el.scrollTo({ left: itemWidth * index, behavior: "smooth" })
  }

  return (
    <div className={`relative ${className}`}>
      {/* Scrollable track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="w-[85vw] max-w-[280px] shrink-0 snap-start pr-3 first:pl-0 last:pr-0"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dots */}
      {children.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="KPI cards">
          {children.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Card ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
