import { format, parseISO } from "date-fns"
import { baseUrl, definedTags, parseTags, PhotoRecord } from "."
import {
  Flame,
  Heart,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const TAG_ICON_MAP: Record<string, LucideIcon> = {
  fav: Heart,
  hot: Flame,
  single: User,
  pair: Users,
  family: UsersRound,
}

const ZOOM_PREVIEW_WIDTH = 420
const ZOOM_PREVIEW_HEIGHT = 320
const MIN_ZOOM = 1.5
const MAX_ZOOM = 12
const DEFAULT_ZOOM = 3
let lastZoomLevel = DEFAULT_ZOOM
const POPUP_OFFSET = 24

type PhotoProps = {
  photo: PhotoRecord
  renderWidth: number
  renderHeight: number
  dense?: boolean
  onOpen?: (photo: PhotoRecord) => void
  onPhotoUpdated: (photo: PhotoRecord) => void
}

export function Photo({
  photo,
  renderWidth,
  renderHeight,
  dense = false,
  onOpen,
  onPhotoUpdated,
}: PhotoProps) {
  const tagsArray = parseTags(photo.tags)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [clientPos, setClientPos] = useState({ x: 0, y: 0 })
  const [showZoom, setShowZoom] = useState(false)
  const [manualZoom, setManualZoom] = useState<number | null>(null)
  const zoomLevel = manualZoom ?? lastZoomLevel
  const containerRef = useRef<HTMLDivElement>(null)
  const isHoveredRef = useRef(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && isHoveredRef.current) setShowZoom(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShowZoom(false)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.5 : -0.5
      setManualZoom((prev) => {
        const next = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, (prev ?? lastZoomLevel) + delta),
        )
        lastZoomLevel = next
        return next
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setClientPos({ x: e.clientX, y: e.clientY })
    setShowZoom(e.shiftKey)
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveredRef.current = true
    if (e.shiftKey) setShowZoom(true)
  }

  const handleMouseLeave = () => {
    isHoveredRef.current = false
    setShowZoom(false)
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  let popupLeft = clientPos.x + POPUP_OFFSET
  let popupTop = clientPos.y - ZOOM_PREVIEW_HEIGHT / 2
  if (popupLeft + ZOOM_PREVIEW_WIDTH > vw)
    popupLeft = clientPos.x - ZOOM_PREVIEW_WIDTH - POPUP_OFFSET
  if (popupTop < 4) popupTop = 4
  if (popupTop + ZOOM_PREVIEW_HEIGHT > vh - 4)
    popupTop = vh - ZOOM_PREVIEW_HEIGHT - 4

  const imgLeft = ZOOM_PREVIEW_WIDTH / 2 - mousePos.x * zoomLevel
  const imgTop = ZOOM_PREVIEW_HEIGHT / 2 - mousePos.y * zoomLevel

  const tagClicked = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    const isIncluded = tagsArray.includes(tag)
    const url = isIncluded
      ? `${baseUrl}/photos/removeTags`
      : `${baseUrl}/photos/addTags`
    const updatedPhoto: PhotoRecord = {
      ...photo,
      tags: isIncluded
        ? tagsArray.filter((t) => t !== tag).join(",")
        : [...tagsArray, tag].join(","),
    }
    await fetch(url, {
      body: JSON.stringify([{ photoId: photo.id, tags: [tag] }]),
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    })
    onPhotoUpdated(updatedPhoto)
  }

  const date = parseISO(photo.referenceDate)
  const chipSize = dense ? 18 : 22
  const iconSize = dense ? 10 : 12
  const appliedTags = definedTags.filter((dt) => tagsArray.includes(dt.tag))

  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-[7px] bg-neutral-200 select-none w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        key={photo.id}
        src={`${baseUrl}/photos/thumbnail/${photo.id}`}
        draggable={false}
        alt=""
      />

      {/* Applied-tag chips — always visible top-left */}
      {appliedTags.length > 0 && (
        <div className="absolute top-1.5 left-1.5 flex gap-1 z-10 pointer-events-none">
          {appliedTags.map((dt) => {
            const IconComp = TAG_ICON_MAP[dt.tag]
            return (
              <span
                key={dt.tag}
                title={dt.label}
                className="grid place-items-center rounded-full bg-white/85 text-neutral-800 backdrop-blur shadow-[0_1px_2px_rgba(0,0,0,.15)]"
                style={{ width: chipSize, height: chipSize }}
              >
                {IconComp && (
                  <IconComp size={iconSize} strokeWidth={2} />
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* Click overlay — opens lightbox */}
      <button
        onClick={() => onOpen?.(photo)}
        className="absolute inset-0 z-0 cursor-default"
        aria-label="Open photo"
      />

      {/* Hover toolbar — tag toggles + date */}
      <div className="absolute inset-x-0 bottom-0 pt-8 pb-1.5 px-1.5 bg-gradient-to-t from-black/65 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition z-10 flex items-end justify-between">
        <div className="flex gap-0.5">
          {definedTags.map((dt) => {
            const on = tagsArray.includes(dt.tag)
            const IconComp = TAG_ICON_MAP[dt.tag]
            return (
              <button
                key={dt.tag}
                title={dt.label}
                onClick={(e) => tagClicked(e, dt.tag)}
                className={
                  "grid place-items-center rounded-full transition " +
                  (on
                    ? "bg-white text-neutral-900"
                    : "bg-black/40 text-white/85 hover:bg-white/25 hover:text-white")
                }
                style={{ width: chipSize, height: chipSize }}
              >
                {IconComp && <IconComp size={iconSize} strokeWidth={2} />}
              </button>
            )
          })}
        </div>
        <span
          className="font-medium tracking-tight text-white/90 leading-none"
          style={{ fontSize: dense ? 9 : 10.5 }}
        >
          {format(date, "yyyy/MM/dd")}
        </span>
      </div>

      {/* Shift+hover zoom preview */}
      {showZoom &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: popupLeft,
              top: popupTop,
              width: ZOOM_PREVIEW_WIDTH,
              height: ZOOM_PREVIEW_HEIGHT,
              overflow: "hidden",
              borderRadius: 10,
              border: "2px solid rgba(100,100,100,0.7)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
              pointerEvents: "none",
              zIndex: 9999,
              backgroundColor: "#111",
            }}
          >
            <img
              src={`${baseUrl}/photos/full/${photo.id}`}
              style={{
                position: "absolute",
                width: renderWidth * zoomLevel,
                height: renderHeight * zoomLevel,
                left: imgLeft,
                top: imgTop,
                maxWidth: "none",
                maxHeight: "none",
              }}
              alt=""
            />
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 8,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: 12,
                padding: "2px 7px",
                borderRadius: 5,
                userSelect: "none",
              }}
            >
              {zoomLevel.toFixed(1)}×
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
