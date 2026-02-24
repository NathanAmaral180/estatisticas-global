"use client"

import { useEffect, useMemo, useState } from "react"
import AnimatedNumber from "../lib/AnimatedNumber"

type Indicator = {
  id: string
  title: string
  value: number | null
  unit: string
  category: string
  source: string
  note?: string
}

type IndicatorsResponse = { items: Indicator[] }

const API =
  process.env.NEXT_PUBLIC_API_BASE || "https://estatisticas-global.onrender.com";

const PINNED_IDS = [
  "population_world",
  "gdp_world_current_usd",
  "population_brazil_worldbank",
  "gdp_brazil_current_usd",
  "selic_bcb_daily",
  "ipca_bcb_monthly",
  "usd_brl_bcb",
  "electricity_access_world_percent",
]

function chipColor(category: string) {
  const c = (category || "").toLowerCase()
  if (c.includes("econom")) return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
  if (c.includes("brasil")) return "bg-yellow-500/15 text-yellow-100 border-yellow-400/20"
  if (c.includes("energia")) return "bg-sky-500/15 text-sky-200 border-sky-400/20"
  return "bg-white/10 text-white/70 border-white/10"
}

export default function Home() {
  const [items, setItems] = useState<Indicator[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setError(null)
        const res = await fetch(`${API}/indicators`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as IndicatorsResponse
        if (!cancelled) setItems(json.items || [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro ao carregar")
      }
    }

    load()
    const t = setInterval(load, 3000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const byId = useMemo(() => {
    const m = new Map<string, Indicator>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const featured = useMemo(() => {
    return PINNED_IDS.map((id) => byId.get(id)).filter(Boolean) as Indicator[]
  }, [byId])

  return (
    <main className="min-h-screen">
      {/* Background premium */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-72 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-72 -right-40 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              AO VIVO
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Estatísticas Global
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Painel moderno • organizado • rápido
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/category/Economia"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Economia →
            </a>
            <a
              href="/category/Brasil"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Brasil →
            </a>
            <a
              href="/category/Energia"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Energia →
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
            Erro: <span className="font-mono">{error}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {featured.map((it) => (
            <a
              key={it.id}
              href={`/indicator/${it.id}`}
              className="rounded-3xl border border-white/10 bg-white/5 p-7 hover:bg-white/7 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${chipColor(it.category)}`}>
                  {it.category}
                </div>
                <div className="text-xs text-white/45">{it.source}</div>
              </div>

              <div className="mt-4 text-lg font-semibold leading-snug">
                {it.title}
              </div>

              <div className="mt-6 text-5xl font-mono font-bold tracking-tight">
                {it.value === null ? (
                  <span className="text-white/40">—</span>
                ) : (
                  <AnimatedNumber value={Number(it.value)} />
                )}
              </div>

              <div className="mt-2 text-sm text-white/45">
                {it.unit}
              </div>

              <div className="mt-5 text-xs text-white/30 font-mono">
                id: {it.id}
              </div>
            </a>
          ))}
        </div>

        <footer className="mt-10 text-xs text-white/35">
          Total carregado: {items.length} indicadores.
        </footer>
      </div>
    </main>
  )
}