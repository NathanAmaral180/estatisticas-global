"use client"

import { useEffect, useMemo, useState } from "react"
import AnimatedNumber from "@/lib/AnimatedNumber"

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
const POLL_MS = 2000

type TopItem = { entity: string; code: string; value: number }
type TopResp = { items: TopItem[] }

type RatesResp = {
  births_per_second: number
  deaths_per_second: number
  net_per_second: number
  today: { births: number; deaths: number; net: number }
  year: { births: number; deaths: number; net: number }
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("pt-BR")
}

export default function PopulationSidebar() {
  const [top, setTop] = useState<TopItem[]>([])
  const [rates, setRates] = useState<RatesResp | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [a, b] = await Promise.all([
          fetch(`${API}/population/top-live?limit=5`, { cache: "no-store" }),
          fetch(`${API}/population/rates`, { cache: "no-store" }),
        ])
        if (!a.ok || !b.ok) return
        const topJson = (await a.json()) as TopResp
        const ratesJson = (await b.json()) as RatesResp
        if (!alive) return
        setTop(topJson.items || [])
        setRates(ratesJson)
      } catch {}
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-semibold text-white/80">População • Top 5</div>
      <div className="mt-3 space-y-3">
        {top.map((it, idx) => (
          <div key={it.code} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-white/50">#{idx + 1}</div>
              <div className="truncate text-sm text-white/80">{it.entity}</div>
            </div>
            <div className="text-right font-mono text-sm tabular-nums text-white">
              <AnimatedNumber value={it.value} />
            </div>
          </div>
        ))}
      </div>

      <div className="my-5 h-px bg-white/10" />

      <div className="text-sm font-semibold text-white/80">Nascimentos / Mortes</div>

      {rates ? (
        <div className="mt-3 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Por segundo</div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Nascimentos</span>
              <span className="font-mono text-white">{rates.births_per_second.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Mortes</span>
              <span className="font-mono text-white">{rates.deaths_per_second.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Saldo</span>
              <span className="font-mono text-white">{rates.net_per_second.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Hoje</div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Nascimentos</span>
              <span className="font-mono text-white">{fmt(rates.today.births)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Mortes</span>
              <span className="font-mono text-white">{fmt(rates.today.deaths)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-white/70">Saldo</span>
              <span className="font-mono text-white">{fmt(rates.today.net)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-white/50">Carregando…</div>
      )}
    </aside>
  )
}