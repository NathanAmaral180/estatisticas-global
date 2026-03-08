import {
  BR,
  US,
  CN,
  IN,
  ID,
  PK,
  // depois a gente adiciona mais conforme precisar
} from "country-flag-icons/react/3x2"

const ISO3_TO_ISO2: Record<string, string> = {
  BRA: "BR",
  USA: "US",
  CHN: "CN",
  IND: "IN",
  IDN: "ID",
  PAK: "PK",
}

const FLAGS: Record<string, any> = {
  BR,
  US,
  CN,
  IN,
  ID,
  PK,
}

export default function Flag({
  iso3,
  className = "h-4 w-6 rounded-sm",
}: {
  iso3?: string | null
  className?: string
}) {
  const iso2 = iso3 ? ISO3_TO_ISO2[iso3.toUpperCase()] : null
  if (!iso2) {
    // fallback elegante quando não tiver
    return <div className={`bg-white/10 ${className}`} />
  }

  const Comp = FLAGS[iso2]
  if (!Comp) return <div className={`bg-white/10 ${className}`} />

  return <Comp className={className} title={iso3 ?? ""} />
}