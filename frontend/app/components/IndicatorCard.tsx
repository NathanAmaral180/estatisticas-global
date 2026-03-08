"use client"

import Link from "next/link"
import AnimatedNumber from "@/app/lib/AnimatedNumber"

type Props = {
  id: string
  title: string
  value: number | string | null
  unit?: string
  category?: string
  source?: string
  as_of?: string
}

function getHref(id: string) {
  if (id === "population_world") {
    return "/world?focus=overview"
  }

  if (id === "co2_world_live") {
    return "/world?focus=climate"
  }

  return `/i/${id}`
}

export default function IndicatorCard({
  id,
  title,
  value,
  unit,
  category,
  source,
  as_of,
}: Props) {
  const href = getHref(id)

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : null

  const isNumber = Number.isFinite(numericValue)

  const asOfText = as_of
    ? new Date(as_of).toLocaleString("pt-BR")
    : null

  return (
    <Link
      href={href}
      className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.05]"
    >
      {category && (
        <div className="text-xs uppercase tracking-widest text-white/40">
          {category}
        </div>
      )}

      <h3 className="mt-2 text-lg font-medium text-white group-hover:text-white/90">
        {title}
      </h3>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="text-3xl font-semibold text-white tabular-nums">
          {value === null
            ? "—"
            : isNumber
            ? <AnimatedNumber value={numericValue as number} />
            : String(value)}
        </div>

        {unit && (
          <div className="text-sm text-white/50">
            {unit}
          </div>
        )}
      </div>

      {(source || asOfText) && (
        <div className="mt-4 text-xs text-white/35">
          {source && <span>Fonte: {source}</span>}
          {source && asOfText && <span> • </span>}
          {asOfText && <span>{asOfText}</span>}
        </div>
      )}
    </Link>
  )
}
