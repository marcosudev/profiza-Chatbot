"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-9 rounded-xl border border-border" />
  }

  const isDark = resolvedTheme === "dark"

  function handleToggle() {
    const next = isDark ? "light" : "dark"

    // Sem suporte ou motion reduzido — troca direta sem animação
    if (
      !buttonRef.current ||
      !("startViewTransition" in document) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(next)
      return
    }

    const rect = buttonRef.current.getBoundingClientRect()
    const x = Math.round(rect.left + rect.width / 2)
    const y = Math.round(rect.top + rect.height / 2)
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    // @ts-ignore — startViewTransition sem tipos completos no TS
    const transition = document.startViewTransition(() => {
      // Aplica a classe .dark diretamente no DOM de forma síncrona,
      // dentro do callback da transição — o browser captura o snapshot
      // do estado antigo ANTES deste callback rodar, então não há flash.
      const root = document.documentElement
      if (next === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
      // Sincroniza o next-themes sem disparar re-render durante a animação
      localStorage.setItem("theme", next)
    })

    transition.ready.then(() => {
      // Sempre: novo tema expande do ponto de clique para fora
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })

    // Após a animação terminar, sincroniza o estado do next-themes
    // para que o React fique ciente da mudança sem causar flash
    transition.finished.then(() => {
      setTheme(next)
    })
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="group relative rounded-xl border border-border p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span className="relative block h-4 w-4 overflow-hidden">
        <Sun
          className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out ${
            isDark
              ? "translate-y-0 rotate-0 opacity-100"
              : "translate-y-4 rotate-90 opacity-0"
          }`}
        />
        <Moon
          className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out ${
            isDark
              ? "-translate-y-4 -rotate-90 opacity-0"
              : "translate-y-0 rotate-0 opacity-100"
          }`}
        />
      </span>
    </button>
  )
}
