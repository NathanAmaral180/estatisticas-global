"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import AnimatedNumber from "@/app/lib/AnimatedNumber"
import Flag from "@/app/components/Flag"

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
const POLL_MS = 2000

type Block =
  | { type: "hero_live_value"; metric?: string; source: { kind: "endpoint"; path: string } }
  | { type: "vitals"; source: { kind: "endpoint"; path: string } }
  | { type: "hero_indicator"; indicator_id: string; source: { kind: "indicator"; id: string } }
  | { type: string; [k: string]: any }

type Section = { id: string; title: string; blocks: Block[] }
type Entity = { id: string; title: string; type?: string; iso3?: string; sections: Section[] }

export default function EntityPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const entityId = params?.id

  const focus = search.get("focus") // ex: focus=climate
  const [entity, setEntity] = useState<Entity | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [activeSection, setActiveSection] = useState<string>("overview")

  // carrega config da entidade
  useEffect(() => {
    if (!entityId) return
    let alive = true

    async function load() {
      try {
        setError(null)
        const res = await fetch(`${API}/entity/${entityId}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!alive) return
        setEntity(json.entity)
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Erro ao carregar entidade")
      }
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [entityId])

  // aplica focus se existir
  useEffect(() => {
    if (!entity) return
    if (focus) {
      const exists = entity.sections?.some((s) => s.id === focus)
      if (exists) setActiveSection(focus)
    } else {
      if (entity.sections?.some((s) => s.id === "overview")) setActiveSection("overview")
      else if (entity.sections?.[0]) setActiveSection(entity.sections[0].id)
    }
  }, [entity, focus])

  const sections = entity?.sections || []
  const current = useMemo(
    () => sections.find((s) => s.id === activeSection) || sections[0],
    [sections, activeSection]
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← voltar
          </Link>

          <div className="flex items-center gap-3">
            {entity?.iso3 ? (
              <Flag iso3={entity.iso3} className="h-5 w-8 rounded-sm ring-1 ring-white/10" />
            ) : null}
            <div className="text-white/90 font-medium">{entity?.title ?? "…"}</div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            Erro: {error}
          </div>
        ) : null}

        {/* Tabs */}
        {sections.length ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {sections.map((s) => {
              const active = s.id === (current?.id ?? activeSection)
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={[
                    "rounded-full px-3 py-1 text-xs border transition",
                    active
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8",
                  ].join(" ")}
                >
                  {s.title}
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Conteúdo da seção */}
        {current ? (
          <div className="grid gap-6">
            {current.blocks?.map((b, idx) => (
              <BlockRenderer key={`${current.id}-${idx}-${b.type}`} block={b} />
            ))}
          </div>
        ) : (
          <div className="text-white/60">Sem seções.</div>
        )}
      </div>
    </main>
  )
}

function BlockRenderer({ block }: { block: Block }) {
  if (block.type === "hero_live_value") return <HeroLiveValueBlock block={block} />
  if (block.type === "vitals") return <VitalsBlock block={block} />
  if (block.type === "hero_indicator") return <HeroIndicatorBlock block={block} />

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
      Bloco ainda não implementado: <span className="font-mono">{block.type}</span>
    </div>
  )
}

function HeroLiveValueBlock({ block }: { block: Extract<Block, { type: "hero_live_value" }> }) {
  const [value, setValue] = useState<number | null>(null)
  const [asOf, setAsOf] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      const res = await fetch(`${API}${block.source.path}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      if (!alive) return
      setValue(typeof json.value === "number" ? json.value : Number(json.value))
      setAsOf(json.as_of ?? null)
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [block.source.path])

  const asOfText = useMemo(() => {
    if (!asOf) return null
    const d = new Date(asOf)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString("pt-BR")
  }, [asOf])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Ao vivo</div>
      <div className="mt-5 text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight text-white tabular-nums">
        {value === null ? "—" : <AnimatedNumber value={value} />}
      </div>
      <div className="mt-4 text-sm text-white/40">{asOfText ? `Atualizado: ${asOfText}` : " "}</div>
    </div>
  )
}

function VitalsBlock({ block }: { block: Extract<Block, { type: "vitals" }> }) {
  const [v, setV] = useState<any>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const res = await fetch(`${API}${block.source.path}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      if (alive) setV(json)
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [block.source.path])

  if (!v) {
    return <div className="h-40 rounded-3xl border border-white/10 bg-white/[0.03] animate-pulse" />
  }

  const birthsToday = Number(v.births?.today ?? 0)
  const deathsToday = Number(v.deaths?.today ?? 0)
  const netToday = Number(v.net_change?.today ?? 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Nascimentos hoje" value={birthsToday} subtitle="estimado • UTC" />
      <Card title="Mortes hoje" value={deathsToday} subtitle="estimado • UTC" />
      <Card title="Saldo hoje" value={netToday} subtitle="nascimentos − mortes" />
    </div>
  )
}

function Card({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">{title}</div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-white">
        <AnimatedNumber value={value} />
      </div>
      {subtitle ? <div className="mt-2 text-xs text-white/40">{subtitle}</div> : null}
    </div>
  )
}

function HeroIndicatorBlock({ block }: { block: Extract<Block, { type: "hero_indicator" }> }) {
  const [ind, setInd] = useState<any>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const res = await fetch(`${API}/indicator/${block.source.id}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      if (alive) setInd(json)
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [block.source.id])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
      <div className="text-sm font-medium text-white/75">{ind?.title ?? block.indicator_id}</div>
      <div className="mt-4 text-5xl font-semibold tabular-nums text-white">
        {ind?.value === null || ind?.value === undefined ? "—" : <AnimatedNumber value={Number(ind.value)} />}
      </div>
      <div className="mt-2 text-xs text-white/40">
        {ind?.source ? `Fonte: ${ind.source}` : " "}
      </div>
    </div>
  )
}