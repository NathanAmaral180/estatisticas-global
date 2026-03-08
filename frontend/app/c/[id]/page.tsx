"use client"

import { useParams } from "next/navigation"
import EntityKindPage from "../../shared/EntityKindPage"

export default function CountryPage() {
  const params = useParams<{ id: string }>()
  return <EntityKindPage kind="country" id={params.id} />
}