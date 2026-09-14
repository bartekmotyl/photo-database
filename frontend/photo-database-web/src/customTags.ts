import dynamicIconImports from "lucide-react/dynamicIconImports"
import type { LucideIcon } from "lucide-react"
import { definedTags, type TagEntry } from "."

// Tags defined per browser instead of in code, edited through the hidden
// editor (Ctrl+Alt+T) or by hand:
//   localStorage.setItem("customTags", JSON.stringify([
//     { tag: "sunset", label: "Sunset", icon: "sunset" },
//     { tag: "print", label: "To print", icon: "printer" },
//   ]))
// `icon` is any icon name from lucide.dev/icons (kebab-case). Toggling a
// custom tag hits the same API as a built-in one, so only the icon and label
// are local - other browsers still see the tag, just without an icon.
export const CUSTOM_TAGS_STORAGE_KEY = "customTags"

type IconName = keyof typeof dynamicIconImports

export type StoredCustomTag = {
  tag: string
  label?: string
  icon: string
}

export const ICON_SEARCH_URL = "https://lucide.dev/icons/"

export async function loadIcon(name: string): Promise<LucideIcon | null> {
  if (!(name in dynamicIconImports)) return null
  try {
    return (await dynamicIconImports[name as IconName]()).default
  } catch {
    return null
  }
}

// Both are filled in by loadCustomTags(), before the app renders.
export let customTags: TagEntry[] = []
export let CUSTOM_TAG_ICON_MAP: Record<string, LucideIcon> = {}

// Shared by the loader and the editor, so both judge an entry the same way.
// `others` are the entries it has to be unique against.
export function customTagProblem(
  entry: Partial<StoredCustomTag>,
  others: Partial<StoredCustomTag>[],
): string | null {
  const { tag, icon } = entry
  if (typeof tag !== "string" || !tag || typeof icon !== "string" || !icon)
    return "A tag name and an icon name are both required."
  if (tag.includes(",")) return "Tag names cannot contain a comma."
  if (definedTags.some((dt) => dt.tag === tag))
    return `"${tag}" is already a built-in tag.`
  if (others.some((other) => other.tag === tag))
    return `"${tag}" is defined more than once.`
  if (!(icon in dynamicIconImports)) return `"${icon}" is not a lucide icon name.`
  return null
}

function readStoredCustomTags(): StoredCustomTag[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(`[customTags] "${CUSTOM_TAGS_STORAGE_KEY}" is not valid JSON - ignored.`)
    return []
  }
  if (!Array.isArray(parsed)) {
    console.warn(`[customTags] "${CUSTOM_TAGS_STORAGE_KEY}" must be an array - ignored.`)
    return []
  }

  const accepted: StoredCustomTag[] = []
  for (const entry of parsed) {
    const candidate = (entry ?? {}) as Partial<StoredCustomTag>
    const problem = customTagProblem(candidate, accepted)
    if (problem) console.warn(`[customTags] skipping ${JSON.stringify(entry)}: ${problem}`)
    else accepted.push(candidate as StoredCustomTag)
  }
  return accepted
}

export async function loadCustomTags(): Promise<void> {
  const stored = readStoredCustomTags()
  if (stored.length === 0) return

  const icons: Record<string, LucideIcon> = {}
  await Promise.all(
    stored.map(async (entry) => {
      const icon = await loadIcon(entry.icon)
      if (icon) icons[entry.tag] = icon
      else console.warn(`[customTags] could not load icon "${entry.icon}" for tag "${entry.tag}".`)
    }),
  )

  CUSTOM_TAG_ICON_MAP = icons
  customTags = stored
    .filter((entry) => icons[entry.tag])
    .map((entry) => ({ tag: entry.tag, label: entry.label ?? entry.tag, icon: entry.icon }))
}
