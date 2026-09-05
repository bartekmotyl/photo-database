import { useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { createPortal } from "react-dom"
import {
  PhotoRecord,
  PhotoRecordExtended,
  baseUrl,
  definedTags,
  parseTags,
  TAG_ICON_MAP,
} from "."
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  MoreHorizontal,
} from "lucide-react"

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
  const rootRef = useRef<HTMLDivElement>(null)

  const currentIndex = photos.findIndex((p) => p.id === selectedPhoto?.id)

  // Extended data (AI description etc.) is not part of the lean list
  // records, so it is fetched per photo when the lightbox shows it.
  const [details, setDetails] = useState<PhotoRecordExtended | undefined>()
  useEffect(() => {
    setDetails(undefined)
    if (!selectedPhoto) return
    let cancelled = false
    fetch(`${baseUrl}/photos/single/${selectedPhoto.id}`)
      .then((r) => (r.ok ? (r.json() as Promise<PhotoRecordExtended>) : undefined))
      .then((d) => {
        if (!cancelled && d) setDetails(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedPhoto?.id])

  // Only render a window of neighbours around the current photo in the film
  // strip — rendering (and fetching thumbnails for) the entire photo list
  // makes opening the popup very slow when the library is large.
  const FILM_STRIP_RADIUS = 20
  const filmStripStart =
    currentIndex < 0 ? 0 : Math.max(0, currentIndex - FILM_STRIP_RADIUS)
  const filmStripPhotos =
    currentIndex < 0
      ? []
      : photos.slice(filmStripStart, currentIndex + FILM_STRIP_RADIUS + 1)

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

  // Prevent the page behind the lightbox from scrolling
  useEffect(() => {
    if (!selectedPhoto) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedPhoto])

  // Route mouse wheel input to the film strip instead of letting it
  // fall through to the page behind. React's onWheel is passive by
  // default, so preventDefault must happen via a native listener.
  useEffect(() => {
    if (!selectedPhoto || !rootRef.current) return
    const el = rootRef.current
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      filmRef.current?.scrollBy({ left: e.deltaY + e.deltaX })
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [selectedPhoto])

  // Scroll film strip to keep active thumb in view
  useEffect(() => {
    if (!filmRef.current || currentIndex < 0) return
    const relativeIndex = currentIndex - filmStripStart
    const thumb = filmRef.current.children[relativeIndex] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [currentIndex, filmStripStart])

  if (!selectedPhoto) return null

  // Prefer the freshly fetched record's tags - the list records come from
  // the initial load and can be stale (e.g. while a labeling job is running).
  const tagsArray = parseTags(
    details?.id === selectedPhoto.id ? details.tags : selectedPhoto.tags,
  )
  const freshDetails = details?.id === selectedPhoto.id ? details : undefined
  const aestheticScore = freshDetails?.aestheticScore0 ?? selectedPhoto.aestheticScore0
  const evaluationScore = freshDetails?.aestheticScore1 ?? selectedPhoto.aestheticScore1
  const evaluationText = freshDetails?.aestheticScoreDescription1
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
      ref={rootRef}
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
            {aestheticScore != null && (
              <span title="aesthetic score"> · ★ {(aestheticScore / 10).toFixed(1)}</span>
            )}
            {evaluationScore != null && (
              <span title="evaluation score"> · ✦ {evaluationScore}/100</span>
            )}
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

      {/* All tags of the photo, as text (icons above only cover definedTags) */}
      {tagsArray.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1 shrink-0">
          {tagsArray.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[11px] leading-4 tracking-tight"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* AI-generated content description (from the extended record) */}
      {freshDetails?.contentDescription && (
        <div className="px-4 pb-1 text-[12px] leading-5 text-white/60 max-w-4xl shrink-0">
          {freshDetails.contentDescription}
        </div>
      )}

      {/* AI evaluation details (slot 1 critique) */}
      {evaluationText && (
        <div className="px-4 pb-1 text-[11.5px] leading-5 text-white/45 max-w-4xl shrink-0 max-h-24 overflow-y-auto whitespace-pre-line">
          {evaluationText}
        </div>
      )}

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
        {filmStripPhotos.map((p) => (
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
