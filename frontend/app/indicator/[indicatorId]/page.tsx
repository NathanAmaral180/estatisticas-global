"use client"

import { useEffect, useState } from "react"
import AnimatedNumber from "../../../lib/AnimatedNumber"

const API =
  process.env.NEXT_PUBLIC_API_BASE || "https://estatisticas-global.onrender.com";

export default function IndicatorPage({ params }: { params: { indicatorId: string } }) {
  const { indicatorId } = params
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setError(null)
        const res = await fetch(`${API}/indicators/${indicatorId}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro ao carregar")
      }
    }

    fetchData()
    const t = setInterval(fetchData, 3000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [indicatorId])

  if (error) {
    return (
      <main className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-8">
        <div className="max-w-xl">
          <a href="/" className="text-sm text-white/70 hover:text-white">← Voltar</a>
          <h1 className="mt-4 text-2xl font-bold">Erro</h1>
          <p className="mt-2 text-white/70">
            Não consegui carregar <span className="font-mono">{indicatorId}</span>:{" "}
            <span className="font-mono">{error}</span>
          </p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center">
        Carregando...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="text-sm text-white/70 hover:text-white">← Voltar</a>

        <h1 className="mt-4 text-3xl font-bold">{data.title ?? indicatorId}</h1>
        <p className="mt-2 text-white/60">
          {data.category ?? "—"} • {data.source ?? "—"}
        </p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="text-6xl font-mono font-bold">
            <AnimatedNumber value={Number(data.value ?? 0)} />
          </div>
          <div className="mt-2 text-white/60">{data.unit}</div>

          <div className="mt-6 text-xs text-white/40 font-mono space-y-1">
            <div>id: {data.id ?? indicatorId}</div>
            <div>as_of: {data.as_of ?? "—"}</div>
          </div>
        </div>
      </div>
    </main>
  )
}