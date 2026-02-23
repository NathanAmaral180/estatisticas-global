"use client"

import { useEffect, useMemo, useState } from "react"
import AnimatedNumber from "../../../lib/AnimatedNumber"

type Indicator = {
  id: string
  title: string
  value: number | null
  unit: string
  as_of: string
  category: string
  source: string
  note?: string
}

type IndicatorsResponse = {
  items: Indicator[]
}

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"

function decodeCategory(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const categoryName = decodeCategory(params.category)
  const [data, setData] = useState<IndicatorsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false

    async function fetchIndicators() {
      try {
        setError(null)
        const res = await fetch(`${API}/indicators`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as IndicatorsResponse
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro ao carregar")
      }
    }

    fetchIndicators()
    const t = setInterval(fetchIndicators, 5000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.items ?? [])
      .filter((it) => (it.category || "Outros") === categoryName)
      .filter((it) => {
        if (!q) return true
        return (
          it.title.toLowerCase().includes(q) ||
          it.id.toLowerCase().includes(q) ||
          (it.source ?? "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
  }, [data, query, categoryName])

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0f14]/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-6">
          <div>
            <a href="/" className="text-sm text-white/70 hover:text-white">← Voltar</a>
            <h1 className="mt-1 text-2xl font-bold">{categoryName}</h1>
            <p className="text-xs text-white/60">{filtered.length} indicador(es)</p>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nesta categoria…"
            className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
            Erro: <span className="font-mono">{error}</span>
          </div>
        )}

        {!data && !error && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">Carregando...</div>
        )}

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-white/60">
            <div className="col-span-7">Indicador</div>
            <div className="col-span-3 text-right">Valor</div>
            <div className="col-span-2 text-right">Fonte</div>
          </div>

          {filtered.map((it) => (
            <a
              key={it.id}
              href={`/indicator/${it.id}`}
              className="grid grid-cols-12 px-4 py-3 border-t border-white/10 hover:bg-white/5 transition"
            >
              <div className="col-span-7">
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-white/50 font-mono">id: {it.id}</div>
                {it.note ? <div className="text-xs text-white/50">{it.note}</div> : null}
              </div>

              <div className="col-span-3 text-right">
                <div className="text-lg font-mono">
                  {it.value === null ? <span className="text-white/50">—</span> : <AnimatedNumber value={Number(it.value)} />}
                </div>
                <div className="text-xs text-white/50">{it.unit}</div>
              </div>

              <div className="col-span-2 text-right">
                <div className="text-xs text-white/70">{it.source}</div>
              </div>
            </a>
          ))}

          {data && filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-white/60">Nada encontrado.</div>
          )}
        </div>
      </section>
    </main>
  )
}