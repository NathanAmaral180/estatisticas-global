"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  value: number
  durationMs?: number
  locale?: string
}

export default function AnimatedNumber({
  value,
  durationMs = 350,
  locale = "pt-BR",
}: Props) {
  const [display, setDisplay] = useState<number>(value)

  const rafRef = useRef<number | null>(null)
  const fromRef = useRef<number>(value)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const from = display
    const to = value

    if (from === to) return

    fromRef.current = from
    startRef.current = performance.now()

    const tick = (t: number) => {
      const elapsed = t - startRef.current
      const p = Math.min(1, elapsed / durationMs)

      // easing suave
      const eased = 1 - Math.pow(1 - p, 3)

      const next = Math.round(fromRef.current + (to - fromRef.current) * eased)
      setDisplay(next)

      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <>{display.toLocaleString(locale)}</>
}