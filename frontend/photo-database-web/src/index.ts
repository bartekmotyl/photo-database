import {
  Flame,
  Heart,
  Mountain,
  Plane,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8066"

export type PhotoRecord = {
  id: number
  referenceDate: string
  lastUpdated: string
  width: number
  height: number
  fileSize: number
  thumbnailWidth: number
  thumbnailHeight: number
  tags: string // comma-separated tag ids
}

export type TagEntry = {
  tag: string
  label: string
  icon: string
}

// Change here to define your custom tags
export const definedTags: TagEntry[] = [
  { tag: "fav", label: "Favourite", icon: "ph-star" },
  { tag: "hot", label: "Hot", icon: "ph-fire" },
  { tag: "single", label: "Single", icon: "ph-person" },
  { tag: "pair", label: "Pair", icon: "ph-users" },
  { tag: "family", label: "Family", icon: "ph-hand-heart" },
  { tag: "landscape", label: "Landscape", icon: "ph-mountains" },
  { tag: "travel", label: "Travel", icon: "ph-airplane" },
]

export const TAG_ICON_MAP: Record<string, LucideIcon> = {
  fav: Heart,
  hot: Flame,
  single: User,
  pair: Users,
  family: UsersRound,
  landscape: Mountain,
  travel: Plane,
}

export function parseTags(tags: string): string[] {
  return tags ? tags.split(",").filter(Boolean) : []
}

export function photoRatio(photo: PhotoRecord): number {
  if (photo.width && photo.height) return photo.width / photo.height
  if (photo.thumbnailWidth && photo.thumbnailHeight)
    return photo.thumbnailWidth / photo.thumbnailHeight
  return 1.5
}
