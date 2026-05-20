import { useEffect, useRef } from "react"
import { format, parseISO } from "date-fns"
import { createPortal } from "react-dom"
import { PhotoRecord, baseUrl, definedTags, parseTags } from "."
import {
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  User,
  Users,
  UsersRound,
  Info,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

const TAG_ICON_MAP: Record<string, LucideIcon> = {
  fav: Heart,
  hot: Flame,
  single: User,
  pair: Users,
  family: UsersRound,
}

export type PhotoSheetProps = {
  photos: PhotoRecord[]
  selectedPhoto: PhotoRecord | undefined
  onPhotoUpdated: (photo: PhotoRecord) => void
  onNavigate: (photo: PhotoRecord) => void
  onClose: () => void
}

export function PhotoSheet({
  photos,
  selectedPhoto,
  onClose,
  onPhotoUpdated,
  onNavigate,
}: PhotoSheetProps) {
  const filmRef = useRef<HTMLDivElement>(null)

  const currentIndex = photos.findIndex((p) => p.id === selectedPhoto?.id)

  useEffect(() => {
    if (!selectedPhoto) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        const prev = photos[currentIndex - 1]
        if (prev) onNavigate(prev)
      } else if (e.key === "ArrowRight") {
        const next = photos[currentIndex + 1]
        if (next) onNavigate(next)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [selectedPhoto, currentIndex, photos, onClose, onNavigate])

  // Scroll film strip to keep active thumb in view
  useEffect(() => {
    if (!filmRef.current || currentIndex < 0) return
    const thumb = filmRef.current.children[currentIndex] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [currentIndex])

  if (!selectedPhoto) return null

  const tagsArray = parseTags(selectedPhoto.tags)
  const date = parseISO(selectedPhoto.referenceDate)

  const tagClicked = async (tag: string) => {
    const isIncluded = tagsArray.includes(tag)
    const url = isIncluded
      ? `${baseUrl}/photos/removeTags`
      : `${baseUrl}/photos/addTags`
    const updatedPhoto: PhotoRecord = {
      ...selectedPhoto,
      tags: isIncluded
        ? tagsArray.filter((t) => t !== tag).join(",")
        : [...tagsArray, tag].join(","),
    }
    await fetch(url, {
      body: JSON.stringify([{ photoId: selectedPhoto.id, tags: [tag] }]),
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    })
    onPhotoUpdated(updatedPhoto)
  }

  const lightbox = (
    <div
      className="fixed inset-0 z-50 bg-neutral-950 text-white/90 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Top bar */}
      <div className="flex items-center h-14 px-4 gap-3 shrink-0">
        <button
          onClick={onClose}
          className="grid place-items-center w-9 h-9 rounded-full hover:bg-white/10 transition shrink-0"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-semibold tracking-tight">
            {format(date, "dd MMM yyyy")}
          </div>
          <div className="text-[11px] text-white/55 truncate">
            {selectedPhoto.width} × {selectedPhoto.height}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {definedTags.map((dt) => {
            const on = tagsArray.includes(dt.tag)
            const IconComp = TAG_ICON_MAP[dt.tag]
            return (
              <button
                key={dt.tag}
                title={dt.label}
                onClick={() => tagClicked(dt.tag)}
                className={
                  "grid place-items-center w-9 h-9 rounded-full transition " +
                  (on
                    ? "bg-white text-neutral-900"
                    : "text-white/75 hover:bg-white/10")
                }
              >
                {IconComp && <IconComp size={16} strokeWidth={2} />}
              </button>
            )
          })}
          <span className="mx-2 w-px h-5 bg-white/15" />
          <button className="grid place-items-center w-9 h-9 rounded-full text-white/75 hover:bg-white/10">
            <Info size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() =>
              window.open(`${baseUrl}/photos/full/${selectedPhoto.id}`, "_blank")
            }
            className="grid place-items-center w-9 h-9 rounded-full text-white/75 hover:bg-white/10"
            title="Open full image"
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center px-16 py-4 min-h-0 relative">
        <img
          key={selectedPhoto.id}
          src={`${baseUrl}/photos/full/${selectedPhoto.id}`}
          alt=""
          className="max-w-full max-h-full object-contain rounded-md shadow-[0_30px_80px_rgba(0,0,0,.6)]"
        />

        {/* Left arrow */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(photos[currentIndex - 1])}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Right arrow */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(photos[currentIndex + 1])}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Film strip */}
      <div
        ref={filmRef}
        className="h-20 flex items-center gap-1.5 px-4 overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigate(p)}
            className={
              "relative shrink-0 rounded-md overflow-hidden transition " +
              (p.id === selectedPhoto.id
                ? "ring-2 ring-white"
                : "opacity-65 hover:opacity-100")
            }
            style={{ width: 56, height: 56 }}
          >
            <img
              src={`${baseUrl}/photos/thumbnail/${p.id}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )

  return createPortal(lightbox, document.body)
}
