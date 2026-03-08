import Link from "next/link"
import EntityKindPage from "@/app/shared/EntityKindPage"

type IndicatorPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string | string[]; focus?: string | string[]; group?: string | string[] }>
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function decodeParam(value?: string) {
  if (!value) return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function formatContextPart(value?: string) {
  if (!value) return ""

  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    decoded = value
  }

  const normalized = decoded.replace(/[-_]+/g, " ").trim()
  if (!normalized) return ""
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function formatFromLabel(fromPath?: string) {
  if (!fromPath) return ""
  if (fromPath === "/world") return "World"
  if (fromPath.startsWith("/c/")) return formatContextPart(fromPath.slice(3))
  return formatContextPart(fromPath.replace(/^\/+/, ""))
}

export default async function IndicatorPage(props: IndicatorPageProps) {
  const { id } = await props.params
  const search = await props.searchParams
  const fromRaw = decodeParam(firstParam(search.from))
  const from = fromRaw ? (fromRaw.startsWith("/") ? fromRaw : `/${fromRaw}`) : ""
  const focusRaw = decodeParam(firstParam(search.focus))
  const groupRaw = decodeParam(firstParam(search.group))
  const focus = formatContextPart(focusRaw)
  const group = formatContextPart(groupRaw)
  const context = [focus, group].filter(Boolean).join(" > ")
  const fromLabel = formatFromLabel(from)
  const qs = new URLSearchParams()
  if (focusRaw) qs.set("focus", focusRaw)
  if (groupRaw) qs.set("group", groupRaw)
  qs.set("indicator", id)
  const fromHref = from ? `${from}${qs.toString() ? `?${qs.toString()}` : ""}` : ""

  return (
    <>
      {fromHref ? (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:pl-4 lg:pr-12 pt-6">
          <div className="text-xs uppercase tracking-[0.14em] text-white/55">
            <Link href={fromHref} className="text-white/70 hover:text-white">
              {fromLabel || "Origem"}
            </Link>
            {focus ? (
              <>
                <span className="mx-1 text-white/35">&gt;</span>
                <Link href={fromHref} className="text-white/65 hover:text-white">
                  {focus}
                </Link>
              </>
            ) : null}
            {group ? (
              <>
                <span className="mx-1 text-white/35">&gt;</span>
                <Link href={fromHref} className="text-white/65 hover:text-white">
                  {group}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      ) : context ? (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:pl-4 lg:pr-12 pt-6">
          <div className="text-xs uppercase tracking-[0.14em] text-white/55">{context}</div>
        </div>
      ) : null}
      <EntityKindPage kind="indicator" id={id} />
    </>
  )
}
