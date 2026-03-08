export function entityLink(entityId: string, focus?: string) {
  return focus ? `/e/${entityId}?focus=${encodeURIComponent(focus)}` : `/e/${entityId}`
}