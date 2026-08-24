"use client"

import * as React from "react"
import type { Professional } from "@/lib/profiza-data"
import type { Lead, NotificacaoCalculada } from "@/lib/supabase/queries"

interface LayoutData {
  profissionais: Professional[]
  leads: Lead[]
  notificacoes: NotificacaoCalculada[]
}

const LayoutDataContext = React.createContext<LayoutData>({
  profissionais: [],
  leads: [],
  notificacoes: [],
})

export function useLayoutData() {
  return React.useContext(LayoutDataContext)
}

export function LayoutDataProvider({
  children,
  profissionais,
  leads,
  notificacoes,
}: LayoutData & { children: React.ReactNode }) {
  return (
    <LayoutDataContext.Provider value={{ profissionais, leads, notificacoes }}>
      {children}
    </LayoutDataContext.Provider>
  )
}
