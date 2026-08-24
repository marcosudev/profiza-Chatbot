"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { MobileHeader } from "@/components/profiza/mobile-header"
import { NotificationsDropdown } from "@/components/profiza/notifications-dropdown"
import { ThemeToggle } from "@/components/profiza/theme-toggle"
import { GlobalSearch } from "@/components/profiza/global-search"

interface HeaderProps {
  title: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  actions?: React.ReactNode
  onPrimaryAction?: () => void
  primaryActionLabel?: string
}

export function Header({
  title,
  subtitle = "Bauru / Operação local",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  actions,
  onPrimaryAction,
  primaryActionLabel = "Novo",
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  const openSearch = () => setSearchOpen(true)
  const closeSearch = () => setSearchOpen(false)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        subtitle={subtitle}
        showSearch={!!onSearchChange}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        primaryAction={
          onPrimaryAction
            ? { label: primaryActionLabel, onClick: onPrimaryAction }
            : undefined
        }
      />

      {/* Desktop Header */}
      <header
        className="sticky top-0 z-10 hidden border-b backdrop-blur-sm md:block"
        style={{
          backgroundColor: "var(--profiza-header-bg)",
          borderColor: "var(--profiza-header-border)",
        }}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global search trigger — always visible */}
            <button
              onClick={openSearch}
              className="flex h-9 w-64 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:border-ring hover:text-foreground"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left text-sm">Buscar no sistema...</span>
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">⌘K</kbd>
            </button>

            <NotificationsDropdown />
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </header>

      <GlobalSearch
        open={searchOpen}
        onClose={closeSearch}
      />
    </>
  )
}