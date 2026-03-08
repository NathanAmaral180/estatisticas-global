export function countryLink(id: string, focus?: string) {
  return focus ? `/c/${id}?focus=${encodeURIComponent(focus)}` : `/c/${id}`
}

export function worldLink(focus?: string) {
  return focus ? `/world?focus=${encodeURIComponent(focus)}` : `/world`
}