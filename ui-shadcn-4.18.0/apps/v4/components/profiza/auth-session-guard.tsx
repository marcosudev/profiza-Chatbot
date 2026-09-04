"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const SESSION_KEY = "profiza-admin-session"
const REMEMBER_KEY = "profiza-admin-remember"
const DEPLOY_KEY = "profiza-admin-deploy"

interface Props {
  children: React.ReactNode
  deployVersion: string
}

export function AuthSessionGuard({ children, deployVersion }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = React.useState(false)

  React.useEffect(() => {
    const rememberedVersion = window.localStorage.getItem(DEPLOY_KEY)
    const sessionVersion = window.sessionStorage.getItem(DEPLOY_KEY)

    if (rememberedVersion && rememberedVersion !== deployVersion) {
      window.localStorage.removeItem(REMEMBER_KEY)
      window.localStorage.removeItem(DEPLOY_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
      window.sessionStorage.removeItem(DEPLOY_KEY)
      void createClient().auth.signOut()
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (window.localStorage.getItem(REMEMBER_KEY) === "true" && rememberedVersion === deployVersion) {
      window.sessionStorage.setItem(SESSION_KEY, "true")
      window.sessionStorage.setItem(DEPLOY_KEY, deployVersion)
      setAuthorized(true)
      return
    }

    if (window.sessionStorage.getItem(SESSION_KEY) === "true" && sessionVersion === deployVersion) {
      setAuthorized(true)
      return
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [deployVersion, pathname, router])

  if (!authorized) {
    return <div className="min-h-screen-mobile bg-background" aria-hidden="true" />
  }

  return <>{children}</>
}

export function markAdminSession(remember: boolean, deployVersion: string) {
  window.sessionStorage.setItem(SESSION_KEY, "true")
  window.sessionStorage.setItem(DEPLOY_KEY, deployVersion)

  if (remember) {
    window.localStorage.setItem(REMEMBER_KEY, "true")
    window.localStorage.setItem(DEPLOY_KEY, deployVersion)
  } else {
    window.localStorage.removeItem(REMEMBER_KEY)
    window.localStorage.removeItem(DEPLOY_KEY)
  }
}

export function clearAdminSession() {
  window.sessionStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(DEPLOY_KEY)
  window.localStorage.removeItem(REMEMBER_KEY)
  window.localStorage.removeItem(DEPLOY_KEY)
}
