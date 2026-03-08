"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AnimatedNumber from "../lib/AnimatedNumber"

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
const POLL_MS = 2000

export type IndicatorGridItem = {
  indicator_id: string
  title?: string
  href?: string
}

export type IndicatorGridBlock = {
  type: "indicator_grid"
  title?: string
  items: IndicatorGridItem[]
  compact_nav?: boolean
}

type IndicatorPayload = {
  value?: number | string | null
  unit?: string | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function IndicatorGridCard({ item }: { item: IndicatorGridItem }) {
  const [indicator, setIndicator] = useState<IndicatorPayload | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const isClickable = Boolean(item.href)
  const cardDomId = `indicator-${item.indicator_id}`

  useEffect(() => {
    let alive = true
    let inFlight = false

    async function load(showLoading: boolean) {
      if (inFlight) return
      inFlight = true
      if (showLoading) setIsLoading(true)
      try {
        const res = await fetch(`${API}/indicator/${item.indicator_id}`, { cache: "no-store" })
        if (!res.ok) {
          if (alive) setIndicator(null)
          return
        }
        const payload = (await res.json()) as IndicatorPayload
        if (alive) setIndicator(payload)
      } catch {
        if (alive) setIndicator(null)
      } finally {
        inFlight = false
        if (alive && showLoading) setIsLoading(false)
      }
    }

    load(true)
    const t = setInterval(() => {
      load(false)
    }, POLL_MS)

    return () => {
      alive = false
      clearInterval(t)
    }
  }, [item.indicator_id])

  const title = item.title?.trim() || item.indicator_id
  const numericValue = useMemo(() => toNumber(indicator?.value), [indicator?.value])
  const isMissingValue = !isLoading && (indicator?.value === null || indicator?.value === undefined)

  const valueNode =
    isLoading
      ? "..."
      : indicator?.value === null || indicator?.value === undefined
      ? "-"
      : numericValue !== null
      ? <AnimatedNumber value={numericValue} />
      : String(indicator.value)

  const cardBody = (
    <div
      className={[
        "relative flex h-full flex-col rounded-2xl border p-6",
        "bg-gradient-to-b from-white/[0.07] via-white/[0.045] to-white/[0.02]",
        "shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
        isClickable
          ? "border-white/15 transition-all duration-200 group-hover:border-white/28 group-hover:from-white/[0.1] group-hover:via-white/[0.06] group-hover:to-white/[0.03] group-hover:shadow-[0_16px_34px_rgba(0,0,0,0.36)]"
          : "border-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium leading-5 text-white/88">{title}</div>
        {isClickable ? (
          <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-white/40">abrir ↗</span>
        ) : null}
      </div>

      <div className="mt-5 text-4xl sm:text-[2.65rem] font-semibold tabular-nums tracking-tight text-white leading-[1.08]">
        {valueNode}
      </div>

      {indicator?.unit ? (
        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/42">{indicator.unit}</div>
      ) : null}

      <div className="mt-5 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.14em] text-white/35">
        {isLoading ? "Carregando" : isMissingValue ? "Sem dados" : "Indicador"}
      </div>
    </div>
  )

  if (item.href) {
    return (
      <Link
        id={cardDomId}
        href={item.href}
        className="group block h-full rounded-2xl cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-[2px]"
      >
        {cardBody}
      </Link>
    )
  }

  return (
    <div id={cardDomId} className="h-full rounded-2xl">
      {cardBody}
    </div>
  )
}

export default function IndicatorGrid({ block }: { block: IndicatorGridBlock }) {
  const items = Array.isArray(block.items) ? block.items : []
  const isCompactNav = Boolean(block.compact_nav)

  if (isCompactNav) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {block.title ? <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">{block.title}</div> : null}

        {items.length ? (
          <div className={`flex flex-wrap gap-2 ${block.title ? "mt-3" : ""}`}>
            {items.map((item, index) => {
              const label = item.title?.trim() || item.indicator_id
              const baseClass =
                "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/85"

              if (item.href) {
                return (
                  <Link
                    id={`indicator-${item.indicator_id}`}
                    key={`${item.indicator_id}-${index}`}
                    href={item.href}
                    className={`${baseClass} transition-colors hover:bg-white/[0.1]`}
                  >
                    {label}
                  </Link>
                )
              }

              return (
                <span id={`indicator-${item.indicator_id}`} key={`${item.indicator_id}-${index}`} className={baseClass}>
                  {label}
                </span>
              )
            })}
          </div>
        ) : (
          <div className={`text-sm text-white/55 ${block.title ? "mt-3" : ""}`}>Sem links</div>
        )}
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
      {block.title ? (
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/62">{block.title}</div>
      ) : null}

      {items.length ? (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${block.title ? "mt-4" : ""}`}>
          {items.map((item, index) => (
            <IndicatorGridCard key={`${item.indicator_id}-${index}`} item={item} />
          ))}
        </div>
      ) : (
        <div className={`text-sm text-white/55 ${block.title ? "mt-4" : ""}`}>Sem indicadores</div>
      )}
    </section>
  )
}
