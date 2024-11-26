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
  tags: string
}

export type TagEntry = {
  tag: string
  label: string
  icon: string
}

// Change here to define your custom tags 
export const definedTags: TagEntry[] = [
  {
    tag: "fav",
    label: "Favorite",
    icon: "ph-star",
  },
  {
    tag: "hot",
    label: "Hot",
    icon: "ph-fire",
  },
  {
    tag: "single",
    label: "Single",
    icon: "ph-person",
  },
  {
    tag: "pair",
    label: "Pair",
    icon: "ph-users",
  },
  {
    tag: "family",
    label: "Family",
    icon: "ph-hand-heart",
  },
]
