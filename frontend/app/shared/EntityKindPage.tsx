"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import AnimatedNumber from "../lib/AnimatedNumber"
import Flag from "../components/Flag"
import HistoryChart from "../components/HistoryChart"
import IndicatorGrid, {
  type IndicatorGridBlock as IndicatorGridBlockType,
  type IndicatorGridItem,
} from "../components/IndicatorGrid"

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
const POLL_MS = 2000

// --------------------
// Types (bem tipado)
// --------------------
type EndpointSource = { kind: "endpoint"; path: string }
type IndicatorSource = { kind: "indicator"; id: string }

type HeroLiveValueBlockType = {
  type: "hero_live_value"
  metric?: string
  source: EndpointSource
}

type VitalsBlockType = {
  type: "vitals"
  source: EndpointSource
}

type HeroIndicatorBlockType = {
  type: "hero_indicator"
  indicator_id: string
  source: IndicatorSource
}

type TopRankingBlockType = {
  type: "top_ranking"
  title?: string
  source: EndpointSource
  props?: { focus?: string }
}

type HistoryChartBlockType = {
  type: "history_chart"
  indicator_id?: string
  source?: { kind: "indicator"; id: string }
}

type UnknownBlockType = { type: string; [k: string]: any }

type Block =
  | HeroLiveValueBlockType
  | VitalsBlockType
  | HeroIndicatorBlockType
  | TopRankingBlockType
  | HistoryChartBlockType
  | IndicatorGridBlockType
  | UnknownBlockType

// Nota de arquitetura futura: entidades podem evoluir de `sections -> blocks`
// para `sections -> subsections -> blocks` (ou equivalente) em paginas grandes.
type Section = { id: string; title: string; blocks: Block[] }
type Entity = { id: string; title: string; kind?: string; iso3?: string; sections: Section[] }

// --------------------
// Page component
// --------------------
export default function EntityKindPage({ kind, id }: { kind: string; id: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const isHomePage = kind === "home"
  const supportsSectionNavigation = kind === "world" || kind === "country"
  const focus = supportsSectionNavigation ? search.get("focus") : null
  const indicator = supportsSectionNavigation ? search.get("indicator") : null
  const group = supportsSectionNavigation ? search.get("group") : null

  const [entity, setEntity] = useState<Entity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // ref para inicializacao do focus (evita "voltar sozinho")
  const didInitFocus = useRef(false)
  const didInitFocusScroll = useRef(false)
  const didInitHashSync = useRef(false)
  const didInitGroupDeepLink = useRef(false)
  const sidebarNavRef = useRef<HTMLElement | null>(null)

  // reset quando trocar de entidade (world/c/ i/)
  useEffect(() => {
    didInitFocus.current = false
    didInitFocusScroll.current = false
    didInitHashSync.current = false
    didInitGroupDeepLink.current = false
    setCollapsedSections({})
  }, [kind, id])

  // carrega config da entidade (polling leve)
  useEffect(() => {
    if (!id) return
    let alive = true

    async function load() {
      try {
        setError(null)
        const res = await fetch(`${API}/entity/${kind}/${id}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return
        setEntity(data.entity)
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
  }, [kind, id])

  const toSlug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  const sections = useMemo(() => {
    const rawSections = Array.isArray(entity?.sections) ? entity.sections : []
    return rawSections.map((section, index) => {
      const rawId = typeof section?.id === "string" ? section.id.trim() : ""
      const rawTitle = typeof section?.title === "string" ? section.title.trim() : ""
      const fallbackId = toSlug(rawTitle) || `secao-${index + 1}`
      return {
        ...section,
        id: rawId || fallbackId,
      }
    })
  }, [entity])
  const getGroupId = (groupBlock: any) => {
    const rawId = typeof groupBlock?.id === "string" ? groupBlock.id.trim() : ""
    if (rawId) return rawId
    const rawTitle = typeof groupBlock?.title === "string" ? groupBlock.title.trim() : ""
    return rawTitle ? toSlug(rawTitle) : ""
  }
  const isSameGroup = (groupValue: string, groupBlock: any) =>
    !!groupValue && !!getGroupId(groupBlock) && toSlug(getGroupId(groupBlock)) === toSlug(groupValue)
  const getGroupAnchorId = (sectionId: string, groupValue: string) =>
    `group-${toSlug(sectionId)}-${toSlug(groupValue)}`
  const formatContextLabel = (value: string) =>
    value
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const sectionAnchors = useMemo(() => {
    const slugCounts: Record<string, number> = {}

    return sections.map((section, index) => {
      const rawTitle = typeof section?.title === "string" ? section.title.trim() : ""
      const titleSlug = rawTitle
        ? rawTitle
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : ""

      const idSlug =
        typeof section?.id === "string" && section.id.trim()
          ? section.id
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
          : ""

      const baseSlug = idSlug || titleSlug || `secao-${index + 1}`
      const seenCount = slugCounts[baseSlug] ?? 0
      slugCounts[baseSlug] = seenCount + 1
      const anchorId = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`

      return { section, anchorId, title: rawTitle }
    })
  }, [sections, activeSection])

  const menuSections = useMemo(
    () => sectionAnchors.filter((entry) => entry.title),
    [sectionAnchors]
  )
  const activeGroupId = supportsSectionNavigation && group ? toSlug(group) : ""
  const showSidebarNav = supportsSectionNavigation && menuSections.length > 1
  const contentSectionAnchors = useMemo(() => {
    if (!supportsSectionNavigation) return sectionAnchors
    const activeEntry = sectionAnchors.find((entry) => entry.section.id === activeSection)
    if (activeEntry) return [activeEntry]
    return sectionAnchors[0] ? [sectionAnchors[0]] : []
  }, [supportsSectionNavigation, sectionAnchors, activeSection])

  useEffect(() => {
    if (!showSidebarNav) return
    const nav = sidebarNavRef.current
    if (!nav) return

    const activeItem = nav.querySelector<HTMLElement>('[data-sidebar-active="true"]')
    if (!activeItem) return

    const navRect = nav.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const isAbove = itemRect.top < navRect.top
    const isBelow = itemRect.bottom > navRect.bottom

    if (!isAbove && !isBelow) return
    activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeSection, showSidebarNav])

  // sincroniza section ativa com focus atual da URL (inclui voltar/avancar)
  useEffect(() => {
    if (!supportsSectionNavigation) return
    if (!sections.length) return

    let nextSectionId = ""
    if (focus) {
      const exists = sections.some((s) => s.id === focus)
      if (exists) {
        nextSectionId = focus
      }
    }

    if (!nextSectionId) {
      if (sections.some((s) => s.id === "overview")) nextSectionId = "overview"
      else if (sections[0]) nextSectionId = sections[0].id
    }

    if (!nextSectionId) return
    if (didInitFocus.current && activeSection === nextSectionId) return

    didInitFocus.current = true
    setActiveSection(nextSectionId)
  }, [sections, focus, supportsSectionNavigation, activeSection])

  useEffect(() => {
    if ((kind !== "world" && kind !== "country") || !focus) return
    if (didInitFocusScroll.current) return
    if (!sectionAnchors.length) return
    didInitFocusScroll.current = true

    const target = sectionAnchors.find(
      ({ section, anchorId }) => section.id === focus || anchorId === focus
    )
    if (!target) return

    const node = document.getElementById(target.anchorId)
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [focus, sectionAnchors, supportsSectionNavigation])

  useEffect(() => {
    if (!supportsSectionNavigation) return
    if (!sections.length) return
    if (didInitGroupDeepLink.current) return
    didInitGroupDeepLink.current = true
    if (!group) return

    const groupId = group
    let targetSectionId = ""

    if (focus && sections.some((s) => s.id === focus)) {
      targetSectionId = focus
    } else {
      const sectionWithGroup = sections.find((section) =>
        (section.blocks || []).some(
          (block) =>
            block?.type === "group" &&
            isSameGroup(groupId, block as any)
        )
      )
      targetSectionId = sectionWithGroup?.id ?? ""
    }

    if (targetSectionId) {
      setCollapsedSections((prev) => ({
        ...prev,
        [targetSectionId]: false,
      }))
      setActiveSection(targetSectionId)
    }

    if (targetSectionId) {
      window.setTimeout(() => {
        const groupNode = document.getElementById(getGroupAnchorId(targetSectionId, groupId))
        if (!groupNode) return
        groupNode.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 120)
    }
  }, [sections, focus, group, supportsSectionNavigation])

  useEffect(() => {
    if (!supportsSectionNavigation) return
    if (!didInitHashSync.current) {
      didInitHashSync.current = true
      const rawHash = window.location.hash
      if (!rawHash || rawHash.length <= 1) return

      const hashId = decodeURIComponent(rawHash.slice(1))
      const node = document.getElementById(hashId)
      if (!node) return

      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: "auto", block: "start" })
      })
      return
    }

    if (!activeSection) return
    const active = sectionAnchors.find((entry) => entry.section.id === activeSection)
    if (!active) return

    const currentHash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ""
    if (currentHash === active.anchorId) return

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}#${active.anchorId}`
    )
  }, [activeSection, sectionAnchors, supportsSectionNavigation])

  useEffect(() => {
    if (!supportsSectionNavigation || !indicator) return

    let highlightTimeout: number | undefined
    const scrollTimeout = window.setTimeout(() => {
      const node = document.getElementById(`indicator-${indicator}`)
      if (!node) return

      node.scrollIntoView({ behavior: "smooth", block: "center" })
      node.classList.add("ring-2", "ring-white/40")

      highlightTimeout = window.setTimeout(() => {
        node.classList.remove("ring-2", "ring-white/40")
      }, 3200)
    }, 120)

    return () => {
      window.clearTimeout(scrollTimeout)
      if (highlightTimeout !== undefined) window.clearTimeout(highlightTimeout)
    }
  }, [indicator, supportsSectionNavigation])

  useEffect(() => {
    const siteTitle = "Estat\u00edsticas Global"
    const entityTitle = entity?.title?.trim()
    if (!entityTitle) {
      document.title = siteTitle
      return
    }

    const titleParts = [entityTitle]

    if (focus) {
      const currentSectionTitle =
        sections.find((section) => section.id === focus)?.title?.trim() || formatContextLabel(focus)
      if (currentSectionTitle) titleParts.push(currentSectionTitle)
    }

    if (group) {
      const scopedSectionId = focus && sections.some((section) => section.id === focus) ? focus : ""
      const groupMatch = sections
        .flatMap((section) => (section.blocks || []).map((block) => ({ sectionId: section.id, block })))
        .find(
          ({ sectionId, block }) =>
            block?.type === "group" &&
            typeof (block as any).title === "string" &&
            (!scopedSectionId || sectionId === scopedSectionId) &&
            isSameGroup(group, block as any)
        )
      const groupTitleFromEntity =
        typeof (groupMatch?.block as any)?.title === "string"
          ? (groupMatch?.block as any).title.trim()
          : ""
      const currentGroupTitle =
        groupTitleFromEntity || formatContextLabel(group)
      if (currentGroupTitle) titleParts.push(currentGroupTitle)
    }

    document.title = `${titleParts.join(" \u2014 ")} | ${siteTitle}`
  }, [entity?.title, sections, focus, group])

  useEffect(() => {
    if (!supportsSectionNavigation) return
    if (!sectionAnchors.length) return

    const nodes = sectionAnchors
      .map((entry) => document.getElementById(entry.anchorId))
      .filter((node): node is HTMLElement => Boolean(node))

    if (!nodes.length) return

    let rafId = 0
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (!visible.length) return

        visible.sort((a, b) => {
          if (b.intersectionRatio !== a.intersectionRatio) {
            return b.intersectionRatio - a.intersectionRatio
          }
          return a.boundingClientRect.top - b.boundingClientRect.top
        })

        const activeAnchorId = visible[0].target.id
        const match = sectionAnchors.find((entry) => entry.anchorId === activeAnchorId)
        if (!match) return

        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          setActiveSection(match.section.id)
        })
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    )

    nodes.forEach((node) => observer.observe(node))

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [sectionAnchors, supportsSectionNavigation])

  useEffect(() => {
    // sync automatico de hash desativado para evitar loop de scroll
  }, [activeSection, sectionAnchors, supportsSectionNavigation])

  function onSelectSection(sectionId: string) {
    const shouldScrollToSectionTop = activeSection !== sectionId
    setActiveSection(sectionId)

    // atualiza URL para nao ficar preso no focus antigo
    const qs = new URLSearchParams(Array.from(search.entries()))
    qs.set("focus", sectionId)
    const targetSection = sections.find((s) => s.id === sectionId)
    const currentGroup = qs.get("group")
    if (currentGroup) {
      const hasGroupInTargetSection = (targetSection?.blocks || []).some(
        (block) =>
          block?.type === "group" &&
          isSameGroup(currentGroup, block as any)
      )
      if (!hasGroupInTargetSection) qs.delete("group")
    }
    const currentIndicator = qs.get("indicator")
    if (currentIndicator) {
      const hasIndicatorInBlocks = (blocks: Block[]): boolean =>
        blocks.some((block) => {
          if (block?.type === "hero_indicator") {
            const heroBlock = block as HeroIndicatorBlockType
            return heroBlock.indicator_id === currentIndicator || heroBlock.source?.id === currentIndicator
          }
          if (block?.type === "history_chart") {
            const historyBlock = block as HistoryChartBlockType
            return historyBlock.indicator_id === currentIndicator || historyBlock.source?.id === currentIndicator
          }
          if (block?.type === "indicator_grid") {
            const gridBlock = block as IndicatorGridBlockType
            return (Array.isArray(gridBlock.items) ? gridBlock.items : []).some(
              (item) => item?.indicator_id === currentIndicator
            )
          }
          if (block?.type === "group" && Array.isArray((block as any).blocks)) {
            return hasIndicatorInBlocks((block as any).blocks as Block[])
          }
          return false
        })

      if (!hasIndicatorInBlocks((targetSection?.blocks || []) as Block[])) {
        qs.delete("indicator")
      }
    }
    router.replace(`?${qs.toString()}`, { scroll: false })

    if (shouldScrollToSectionTop) {
      const targetAnchorId = sectionAnchors.find((entry) => entry.section.id === sectionId)?.anchorId
      if (!targetAnchorId) return
      const targetHeadingId = `${targetAnchorId}-heading`
      requestAnimationFrame(() => {
        const sectionNode = document.getElementById(targetAnchorId)
        if (!sectionNode) return
        sectionNode.scrollIntoView({ behavior: "smooth", block: "start" })
        const headingNode = document.getElementById(targetHeadingId) as HTMLElement | null
        headingNode?.focus({ preventScroll: true })
      })
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:pl-4 lg:pr-12 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          {!isHomePage ? (
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              &larr; voltar
            </Link>
          ) : null}

          <div className="flex items-center gap-3">
            {entity?.iso3 ? (
              <Flag iso3={entity.iso3} className="h-5 w-8 rounded-sm ring-1 ring-white/10" />
            ) : null}
            <div className="text-white/90 font-medium">{entity?.title ?? "..."}</div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            Erro: {error}
          </div>
        ) : null}

        {sectionAnchors.length ? (
          <div className={showSidebarNav ? "grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]" : "grid gap-6"}>
            {showSidebarNav ? (
              <aside className="hidden lg:block">
                <nav ref={sidebarNavRef} className="fixed left-6 top-24 w-[220px] max-h-[calc(100vh-6rem)] overflow-y-auto grid gap-2">
                  {menuSections.map((entry) => {
                    const isActive = activeSection === entry.section.id
                    const groups = (entry.section.blocks || [])
                      .filter(
                        (block) =>
                          block?.type === "group" &&
                          typeof (block as any).title === "string" &&
                          (block as any).title.trim()
                      )
                      .map((block) => {
                        const groupBlock = block as any
                        return {
                          id: getGroupId(groupBlock),
                          title: groupBlock.title.trim(),
                          blocks: Array.isArray(groupBlock.blocks) ? (groupBlock.blocks as Block[]) : [],
                        }
                      })
                    const isSectionExpanded =
                      groups.length > 0 &&
                      !collapsedSections[entry.section.id] &&
                      (!supportsSectionNavigation || entry.section.id === activeSection)
                    const groupListId = `${entry.anchorId}-groups`

                    return (
                      <div key={`${entry.anchorId}-${entry.section.id}`} className="grid gap-1">
                        <a
                          href={`#${entry.anchorId}`}
                          onClick={() => {
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [entry.section.id]: false,
                            }))
                            onSelectSection(entry.section.id)
                          }}
                          aria-current={isActive ? "page" : undefined}
                          aria-expanded={groups.length ? (isSectionExpanded ? "true" : "false") : undefined}
                          aria-controls={groups.length ? groupListId : undefined}
                          data-sidebar-active={isActive ? "true" : "false"}
                          className={[
                            "rounded-full px-3 py-1 text-xs border transition",
                            isActive
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8",
                          ].join(" ")}
                        >
                          {!supportsSectionNavigation ? (
                            <span
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setCollapsedSections((prev) => ({
                                  ...prev,
                                  [entry.section.id]: !prev[entry.section.id],
                                }))
                              }}
                              className="mr-1 inline-flex h-6 w-6 items-center justify-center text-base leading-none cursor-pointer select-none"
                            >
                              {collapsedSections[entry.section.id] ? "\u25B8" : "\u25BE"}
                            </span>
                          ) : null}
                          <span>{entry.title}</span>
                        </a>

                        {groups.length && !collapsedSections[entry.section.id] && (!supportsSectionNavigation || entry.section.id === activeSection) ? (
                          <div id={groupListId} role="group" className="grid gap-1 pl-8">
                            {groups.map((groupItem, groupIdx) => {
                              const groupId = groupItem.id
                              const groupTitle = groupItem.title
                              const isGroupActive = activeGroupId === toSlug(groupId)
                              return (
                                <button
                                  key={`${entry.anchorId}-group-${groupIdx}`}
                                  type="button"
                                  onClick={() => {
                                    setCollapsedSections((prev) => ({
                                      ...prev,
                                      [entry.section.id]: false,
                                    }))
                                    setActiveSection(entry.section.id)
                                    const qs = new URLSearchParams(Array.from(search.entries()))
                                    qs.set("group", groupId)
                                    const currentIndicator = qs.get("indicator")
                                    if (currentIndicator) {
                                      const targetGroupBlocks = groupItem.blocks

                                      const hasIndicatorInBlocks = (blocks: Block[]): boolean =>
                                        blocks.some((block) => {
                                          if (block?.type === "hero_indicator") {
                                            const heroBlock = block as HeroIndicatorBlockType
                                            return (
                                              heroBlock.indicator_id === currentIndicator ||
                                              heroBlock.source?.id === currentIndicator
                                            )
                                          }
                                          if (block?.type === "history_chart") {
                                            const historyBlock = block as HistoryChartBlockType
                                            return (
                                              historyBlock.indicator_id === currentIndicator ||
                                              historyBlock.source?.id === currentIndicator
                                            )
                                          }
                                          if (block?.type === "indicator_grid") {
                                            const gridBlock = block as IndicatorGridBlockType
                                            return (Array.isArray(gridBlock.items) ? gridBlock.items : []).some(
                                              (item) => item?.indicator_id === currentIndicator
                                            )
                                          }
                                          if (block?.type === "group" && Array.isArray((block as any).blocks)) {
                                            return hasIndicatorInBlocks((block as any).blocks as Block[])
                                          }
                                          return false
                                        })

                                      if (!hasIndicatorInBlocks(targetGroupBlocks)) {
                                        qs.delete("indicator")
                                      }
                                    }
                                    router.replace(`?${qs.toString()}`, { scroll: false })
                                    requestAnimationFrame(() => {
                                      const groupNode = document.getElementById(
                                        getGroupAnchorId(entry.section.id, groupId)
                                      )
                                      if (!groupNode) return
                                      groupNode.scrollIntoView({ behavior: "smooth", block: "start" })
                                    })
                                  }}
                                  aria-current={isGroupActive ? "true" : undefined}
                                  className={[
                                    "relative z-10 block w-full cursor-pointer pointer-events-auto rounded-md px-2 py-1 text-left text-[11px] leading-4 transition",
                                    isGroupActive
                                      ? "bg-white/12 text-white ring-1 ring-white/20"
                                      : "text-white/45 hover:bg-white/6 hover:text-white/70",
                                  ].join(" ")}
                                >
                                  {groupTitle}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </nav>
              </aside>
            ) : null}

            <div>
              {showSidebarNav ? (
                <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
                  {menuSections.map((entry) => {
                    const isActive = activeSection === entry.section.id
                    return (
                      <a
                        key={`${entry.anchorId}-${entry.section.id}`}
                        href={`#${entry.anchorId}`}
                        onClick={() => onSelectSection(entry.section.id)}
                        className={[
                          "rounded-full px-3 py-1 text-xs border transition",
                          isActive
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8",
                        ].join(" ")}
                      >
                        {entry.title}
                      </a>
                    )
                  })}
                </div>
              ) : null}

              <div className="grid gap-6">
                {contentSectionAnchors.map((entry, sectionIndex) => (
                  <section
                    key={`${entry.section.id}-${sectionIndex}`}
                    id={supportsSectionNavigation ? entry.anchorId : undefined}
                    aria-labelledby={
                      supportsSectionNavigation && entry.title && !(isHomePage && entry.section.id === "overview")
                        ? `${entry.anchorId}-heading`
                        : undefined
                    }
                    className="scroll-mt-24 grid gap-4"
                  >
                    {entry.title && !(isHomePage && entry.section.id === "overview") ? (
                      <header className="grid gap-3 pt-2 pb-1">
                        {supportsSectionNavigation ? (
                          <h2
                            id={`${entry.anchorId}-heading`}
                            tabIndex={-1}
                            className="text-base sm:text-lg font-semibold uppercase tracking-[0.12em] text-white/82"
                          >
                            {entry.title}
                          </h2>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedSections((prev) => {
                                const willCollapse = !prev[entry.section.id]
                                const nextCollapsed = {
                                  ...prev,
                                  [entry.section.id]: willCollapse,
                                }

                                if (willCollapse && activeSection === entry.section.id) {
                                  const currentIndex = sectionAnchors.findIndex(
                                    (anchor) => anchor.section.id === entry.section.id
                                  )
                                  let nextActive = ""

                                  for (let i = currentIndex + 1; i < sectionAnchors.length; i += 1) {
                                    const candidateId = sectionAnchors[i].section.id
                                    if (!nextCollapsed[candidateId]) {
                                      nextActive = candidateId
                                      break
                                    }
                                  }

                                  if (!nextActive) {
                                    for (let i = currentIndex - 1; i >= 0; i -= 1) {
                                      const candidateId = sectionAnchors[i].section.id
                                      if (!nextCollapsed[candidateId]) {
                                        nextActive = candidateId
                                        break
                                      }
                                    }
                                  }

                                  setActiveSection(nextActive)
                                }

                                return nextCollapsed
                              })
                            }
                            className="text-left"
                          >
                            <h2 className="text-base sm:text-lg font-semibold uppercase tracking-[0.12em] text-white/82">
                              {entry.title}
                            </h2>
                          </button>
                        )}
                        <div className="h-px bg-gradient-to-r from-white/30 via-white/12 to-transparent" />
                      </header>
                    ) : null}
                    <div
                      className={[
                        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                        collapsedSections[entry.section.id]
                          ? "max-h-0 opacity-0 pointer-events-none"
                          : "max-h-[2200px] opacity-100",
                      ].join(" ")}
                    >
                      <div className="grid gap-6">
                        {entry.section.blocks?.map((b, idx) => {
                          const blockTitle =
                            typeof (b as any).title === "string" ? (b as any).title.trim() : ""
                          const groupBlocks =
                            b.type === "group" && Array.isArray((b as any).blocks)
                              ? ((b as any).blocks as Block[])
                              : null

                          if (groupBlocks) {
                            const groupId = getGroupId(b as any)
                            const groupAnchorId = blockTitle
                              ? getGroupAnchorId(entry.section.id, groupId || blockTitle)
                              : undefined
                            const groupHeadingId = groupAnchorId ? `${groupAnchorId}-heading` : undefined
                            const isGroupActive =
                              supportsSectionNavigation &&
                              !!groupId &&
                              activeGroupId === toSlug(groupId)
                            return (
                              <div
                                id={supportsSectionNavigation ? groupAnchorId : undefined}
                                role={blockTitle ? "region" : undefined}
                                aria-labelledby={blockTitle ? groupHeadingId : undefined}
                                key={`${entry.section.id}-${idx}-${b.type}`}
                                className={[
                                  "grid gap-3 scroll-mt-24 rounded-xl transition",
                                  isGroupActive
                                    ? "border border-white/25 bg-white/[0.07] ring-1 ring-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] p-3"
                                    : "",
                                ].join(" ")}
                              >
                                {blockTitle ? (
                                  <div className="pt-2 pb-1">
                                    <h3 id={groupHeadingId} className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.1em] text-white/48">
                                      {blockTitle}
                                    </h3>
                                  </div>
                                ) : null}
                                <div className="grid gap-6">
                                  {groupBlocks.map((groupBlock, groupIdx) => (
                                    <BlockRenderer
                                      key={`${entry.section.id}-${idx}-${groupIdx}-${groupBlock.type}`}
                                      block={groupBlock}
                                      linkContext={
                                        supportsSectionNavigation
                                          ? {
                                              from: kind === "world" ? "/world" : `/c/${id}`,
                                              focus: entry.section.id,
                                              group: groupId || undefined,
                                            }
                                          : kind === "topic"
                                          ? { focus: id }
                                          : undefined
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={`${entry.section.id}-${idx}-${b.type}`} className="grid gap-2">
                              {blockTitle ? (
                                <div className="pt-2 pb-1">
                                  <h3 className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.1em] text-white/48">
                                    {blockTitle}
                                  </h3>
                                </div>
                              ) : null}
                              <BlockRenderer
                                block={b}
                                linkContext={
                                  supportsSectionNavigation
                                    ? {
                                        from: kind === "world" ? "/world" : `/c/${id}`,
                                        focus: entry.section.id,
                                      }
                                    : kind === "topic"
                                    ? { focus: id }
                                    : undefined
                                }
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-white/60">Sem secoes.</div>
        )}
      </div>
    </main>
  )
}

// --------------------
// Block renderer
// --------------------
type IndicatorLinkContext = { from?: string; focus?: string; group?: string }

function withIndicatorContextHref(item: IndicatorGridItem, context?: IndicatorLinkContext): IndicatorGridItem {
  if (!context?.focus) return item
  if (!item.href) return item

  const [basePath, queryString = ""] = item.href.split("?")
  const isIndicatorHref = basePath.startsWith("/i/")
  const isEntityContextHref = basePath === "/world" || basePath.startsWith("/c/")
  if (!isIndicatorHref && !isEntityContextHref) return item

  const qs = new URLSearchParams(queryString)

  if (isIndicatorHref) {
    if (!context.from) return item
    qs.set("from", context.from)
    qs.set("focus", context.focus)
    if (context.group) qs.set("group", context.group)
    else qs.delete("group")
  } else {
    qs.set("focus", context.focus)
  }

  return {
    ...item,
    href: `${basePath}?${qs.toString()}`,
  }
}

function BlockRenderer({ block, linkContext }: { block: Block; linkContext?: IndicatorLinkContext }) {
  if (block.type === "top_ranking") {
    return <TopRankingBlock block={block as TopRankingBlockType} />
  }

  if (block.type === "hero_live_value") {
    return <HeroLiveValueBlock block={block as HeroLiveValueBlockType} />
  }

  if (block.type === "vitals") {
    return <VitalsBlock block={block as VitalsBlockType} />
  }

  if (block.type === "hero_indicator") {
    return <HeroIndicatorBlock block={block as HeroIndicatorBlockType} />
  }

  if (block.type === "history_chart") {
    return <HistoryChartBlock block={block as HistoryChartBlockType} />
  }

  if (block.type === "indicator_grid") {
    const gridBlock = block as IndicatorGridBlockType
    const contextAwareBlock: IndicatorGridBlockType = {
      ...gridBlock,
      items: (Array.isArray(gridBlock.items) ? gridBlock.items : []).map((item) =>
        withIndicatorContextHref(item, linkContext)
      ),
    }
    return <IndicatorGrid block={contextAwareBlock} />
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
      Bloco ainda nao implementado: <span className="font-mono">{block.type}</span>
    </div>
  )
}

// --------------------
// Blocks
// --------------------
function HeroLiveValueBlock({ block }: { block: HeroLiveValueBlockType }) {
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
    return d.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    })
  }, [asOf])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Ao vivo</div>
      <div className="mt-5 text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tight text-white tabular-nums">
        {value === null ? "-" : <AnimatedNumber value={value} />}
      </div>
      <div className="mt-4 text-sm text-white/40">{asOfText ? `Atualizado: ${asOfText}` : " "}</div>
    </div>
  )
}

function VitalsBlock({ block }: { block: VitalsBlockType }) {
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

  if (!v) return <div className="h-40 rounded-3xl border border-white/10 bg-white/[0.03] animate-pulse" />

  const birthsToday = Number(v.births?.today ?? 0)
  const deathsToday = Number(v.deaths?.today ?? 0)
  const netToday = Number(v.net_change?.today ?? 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Nascimentos hoje" value={birthsToday} subtitle="estimado - UTC" />
      <Card title="Mortes hoje" value={deathsToday} subtitle="estimado - UTC" />
      <Card title="Saldo hoje" value={netToday} subtitle="nascimentos - mortes" />
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

function HeroIndicatorBlock({ block }: { block: HeroIndicatorBlockType }) {
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
    <div id={`indicator-${block.indicator_id}`} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
      <div className="text-sm font-medium text-white/75">{ind?.title ?? block.indicator_id}</div>
      <div className="mt-4 text-5xl font-semibold tabular-nums text-white">
        {ind?.value === null || ind?.value === undefined ? "-" : <AnimatedNumber value={Number(ind.value)} />}
      </div>
      <div className="mt-2 text-xs text-white/40">{ind?.source ? `Fonte: ${ind.source}` : " "}</div>
    </div>
  )
}

function TopRankingBlock({ block }: { block: TopRankingBlockType }) {
  const [items, setItems] = useState<{ id?: string; entity: string; code?: string; value: number }[]>([])

  useEffect(() => {
    let alive = true

    async function load() {
      const res = await fetch(`${API}${block.source.path}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      const arr = (json.items || []).map((x: any) => ({
        id: x.id ? String(x.id) : undefined,
        entity: String(x.entity),
        code: x.code ? String(x.code) : undefined,
        value: Number(x.value),
      }))
      if (alive) setItems(arr)
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [block.source.path])

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white/75">{block.title ?? "Ranking"}</div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">ao vivo</div>
      </div>

      <div className="mt-5 divide-y divide-white/8">
        {items.map((c, i) => {
          const href =
            c.id ? `/c/${c.id}${block.props?.focus ? `?focus=${encodeURIComponent(block.props.focus)}` : ""}` : null

          const row = (
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {c.code ? <Flag iso3={c.code} className="h-4 w-6 rounded-sm ring-1 ring-white/10" /> : null}
                  <div className="text-sm text-white/80 truncate">
                    {i + 1}. {c.entity}
                  </div>
                </div>
                {c.code ? <div className="mt-1 text-xs text-white/35 font-mono">{c.code}</div> : null}
              </div>

              <div className="text-right w-44">
                <div className="text-sm font-mono text-white tabular-nums">
                  <AnimatedNumber value={Number(c.value)} />
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.20em] text-white/35">pessoas</div>
              </div>
            </div>
          )

          return href ? (
            <Link key={`${c.entity}-${i}`} href={href} className="block hover:bg-white/[0.03] rounded-2xl px-2 -mx-2">
              {row}
            </Link>
          ) : (
            <div key={`${c.entity}-${i}`}>{row}</div>
          )
        })}
      </div>

      <div className="mt-5 text-xs text-white/35">Atualiza: {POLL_MS / 1000}s</div>
    </div>
  )
}
function HistoryChartBlock({ block }: { block: HistoryChartBlockType }) {
  const [data, setData] = useState<{ x: string | number; y: number }[]>([])
  const historyIndicatorId = block.indicator_id ?? block.source?.id
  const [historyMode, setHistoryMode] = useState<"recent" | "long">("recent")

  useEffect(() => {
    let alive = true

    async function load() {
      if (!historyIndicatorId) {
        if (alive) setData([])
        return
      }

      const res = await fetch(`${API}/indicator/${historyIndicatorId}/history?mode=${historyMode}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      const items = Array.isArray(json?.items) ? json.items : []
      const pointsFallback = Array.isArray(json?.points) ? json.points : []
      const raw = items.length ? items : pointsFallback
      const points = raw
        .map((p: any) => {
          const x = p?.x ?? p?.ts ?? p?.date ?? p?.label
          const yRaw = p?.y ?? p?.value
          const y = Number(yRaw)
          if ((typeof x !== "string" && typeof x !== "number") || Number.isNaN(y)) return null
          return { x, y }
        })
        .filter(Boolean) as { x: string | number; y: number }[]
      if (alive) setData(points)
    }

    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [historyIndicatorId, historyMode])

  const modeSelector = (
    <div className="flex items-center gap-2">
      {(["recent", "long"] as const).map((mode) => {
        const active = historyMode === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setHistoryMode(mode)}
            className={[
              "rounded-full px-3 py-1 text-xs border transition",
              active
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
            ].join(" ")}
          >
            {mode === "recent" ? "Recente" : "Longo"}
          </button>
        )
      })}
    </div>
  )

  if (!data.length) {
    return (
      <div className="grid gap-3">
        {modeSelector}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-sm text-white/60">
          Sem historico disponivel
        </div>
      </div>
    )
  }

  // @ts-expect-error - chart can receive extra presentation props in this page
  return (
    <div className="grid gap-3">
      {modeSelector}
      <HistoryChart data={data} xKey="x" yKey="y" title="Historico" />
    </div>
  )
}
