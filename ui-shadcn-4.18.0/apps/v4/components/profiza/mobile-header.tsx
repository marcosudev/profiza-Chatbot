"use client"

import { ArrowLeft, Menu, Plus, Search, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/new-york-v4/ui/drawer"

import { NotificationsDropdown } from "@/components/profiza/notifications-dropdown"
import { ThemeToggle } from "@/components/profiza/theme-toggle"

interface MobileHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

export function MobileHeader({
  title,
  subtitle,
  showBack,
  onBack,
  showSearch,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  primaryAction,
}: MobileHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md md:hidden"
      style={{ borderColor: "var(--profiza-header-border)" }}
    >
      {/* Search overlay */}
      {searchOpen && onSearchChange ? (
        <div className="flex h-14 items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSearchOpen(false)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            autoFocus
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 flex-1"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          {/* Left side */}
          <div className="flex items-center gap-2 min-w-0">
            {showBack ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Menu</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tema</span>
                      <ThemeToggle />
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Profiza Admin v1.0
                      </p>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
            <div className="min-w-0">
              {subtitle && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
              <h1 className="text-base font-semibold truncate">{title}</h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 shrink-0">
            {showSearch && onSearchChange && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            <NotificationsDropdown />
            {primaryAction && (
              <Button
                size="sm"
                className="h-9 gap-1 px-3"
                onClick={primaryAction.onClick}
              >
                {primaryAction.icon || <Plus className="h-4 w-4" />}
                <span className="hidden xs:inline">{primaryAction.label}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
