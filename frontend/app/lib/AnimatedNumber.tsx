"use client"

import { useEffect, useRef, useState } from "react"

export default function AnimatedNumber({
  value,
  duration = 650,
}: {
  value: number
  duration?: number
}) {
  const [display, setDisplay] = useState<number>(value)
  const rafRef = useRef<number | null>(null)
  const fromRef = useRef<number>(value)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    fromRef.current = display
    startRef.current = performance.now()

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = easeOutCubic(t)
      const v = fromRef.current + (value - fromRef.current) * eased
      setDisplay(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return <>{Math.round(display).toLocaleString("pt-BR")}</>
}