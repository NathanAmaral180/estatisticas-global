"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
})

const numberWithSeparators = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

const tooltipDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
})

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
})

const shortDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

const shortTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
})

const yearFormatter = new Intl.DateTimeFormat("pt-BR", { year: "numeric" })

type XAxisMode = "recent" | "long" | "year" | "raw"

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 1_000_000_000_000) {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (value >= 1_000_000_000 && value < 10_000_000_000) {
      const d = new Date(value * 1000)
      return Number.isNaN(d.getTime()) ? null : d
    }
    return null
  }

  if (typeof value === "string") {
    const ts = Date.parse(value)
    if (!Number.isNaN(ts)) return new Date(ts)
  }

  return null
}

function toYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= 3000) {
    return value
  }
  if (typeof value === "string" && /^\d{4}$/.test(value)) {
    const year = Number(value)
    if (year >= 1000 && year <= 3000) return year
  }
  return null
}

function inferXAxisMode(data: any[], xKey: string): { mode: XAxisMode; spanMs: number } {
  const values = data.map((d) => d?.[xKey]).filter((v) => v !== undefined && v !== null)
  if (!values.length) return { mode: "raw", spanMs: 0 }

  const yearLike = values.filter((v) => toYear(v) !== null).length
  if (yearLike / values.length >= 0.8) return { mode: "year", spanMs: 0 }

  const dateValues = values.map(toDate).filter((d): d is Date => d !== null)
  if (dateValues.length / values.length < 0.7) return { mode: "raw", spanMs: 0 }

  const times = dateValues.map((d) => d.getTime())
  const spanMs = Math.max(...times) - Math.min(...times)
  if (spanMs <= 45 * 24 * 60 * 60 * 1000) return { mode: "recent", spanMs }
  return { mode: "long", spanMs }
}

function looksIsoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T|\s)?/.test(value)
}

function formatRawLikeTick(value: unknown): string {
  if (typeof value === "string") {
    const parsed = toDate(value)
    if (parsed) return shortDateFormatter.format(parsed)
    if (looksIsoLike(value)) return value.slice(0, 10)
    const trimmed = value.trim()
    if (trimmed.length > 10) return `${trimmed.slice(0, 10)}...`
    return trimmed
  }
  if (typeof value === "number") {
    const asYear = toYear(value)
    if (asYear !== null) return String(asYear)
    return numberWithSeparators.format(value)
  }
  return String(value ?? "")
}

function formatXAxisTick(value: unknown, mode: XAxisMode, spanMs: number): string {
  if (mode === "year") {
    const y = toYear(value)
    return y !== null ? String(y) : String(value ?? "")
  }

  if (mode === "recent" || mode === "long") {
    const date = toDate(value)
    if (!date) return String(value ?? "")

    if (mode === "recent") {
      if (spanMs <= 24 * 60 * 60 * 1000) return shortTimeFormatter.format(date)
      return shortDateTimeFormatter.format(date)
    }

    if (spanMs >= 3 * 365 * 24 * 60 * 60 * 1000) return yearFormatter.format(date)
    return shortDateFormatter.format(date)
  }

  return formatRawLikeTick(value)
}

function formatTooltipLabel(value: unknown, mode: XAxisMode): string {
  if (mode === "year") {
    const y = toYear(value)
    return y !== null ? String(y) : String(value ?? "")
  }

  const date = toDate(value)
  if (date) return tooltipDateTimeFormatter.format(date)

  return String(value ?? "")
}

function formatCompactYAxis(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? "")
  return compactNumber.format(n)
}

function formatTooltipValue(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? "")

  const full = numberWithSeparators.format(n)
  if (Math.abs(n) >= 1000) {
    return `${full} (${compactNumber.format(n)})`
  }
  return full
}

function xTickIntervalFor(mode: XAxisMode, points: number): number {
  if (points <= 1) return 0

  const targetVisibleTicks =
    mode === "recent"
      ? 4
      : mode === "long"
        ? 5
        : mode === "year"
          ? 6
          : 4

  return Math.max(0, Math.ceil(points / targetVisibleTicks) - 1)
}

type HistoryChartProps = {
  data: any[]
  xKey: string
  yKey: string
  height?: number
}

export default function HistoryChart({
  data,
  xKey,
  yKey,
  height = 280,
}: HistoryChartProps) {
  const xAxisMeta = inferXAxisMode(data, xKey)
  const xTickInterval = xTickIntervalFor(xAxisMeta.mode, data.length)

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 6, left: 2, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            tickFormatter={(value) => formatXAxisTick(value, xAxisMeta.mode, xAxisMeta.spanMs)}
            minTickGap={42}
            interval={xTickInterval}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            tickFormatter={formatCompactYAxis}
            tickCount={4}
            tickMargin={6}
            width={56}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: unknown) => [formatTooltipValue(value), "Valor"]}
            labelFormatter={(label: unknown) => formatTooltipLabel(label, xAxisMeta.mode)}
            labelStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 6 }}
            itemStyle={{ color: "#fff", fontSize: 13, fontWeight: 500 }}
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "#fff",
              boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
              padding: "10px 12px",
            }}
          />
          <Line type="monotone" dataKey={yKey} stroke="#4ade80" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
