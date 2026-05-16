import { format, parseISO } from "date-fns"
import { baseUrl, definedTags, PhotoRecord, TagEntry } from "."
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const ZOOM_PREVIEW_WIDTH = 420
const ZOOM_PREVIEW_HEIGHT = 320
const MIN_ZOOM = 1.5
const MAX_ZOOM = 12
const DEFAULT_ZOOM = 3
let lastZoomLevel = DEFAULT_ZOOM
const POPUP_OFFSET = 24

type PhotoProps = {
  scale: number
  photo: PhotoRecord
  onPhotoUpdated: (photo: PhotoRecord) => void
  onNavigation?: (photo: PhotoRecord) => void
}

export function Photo({
  scale,
  photo,
  onPhotoUpdated,
  onNavigation,
}: PhotoProps) {
  const tagsArray = photo.tags.split(",")
  const [showTags] = useState(true)
  const [showDate] = useState(true)
  const [showActions] = useState(true)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [clientPos, setClientPos] = useState({ x: 0, y: 0 })
  const [showZoom, setShowZoom] = useState(false)
  // null = not manually adjusted yet → fall back to shared lastZoomLevel at render time
  const [manualZoom, setManualZoom] = useState<number | null>(null)
  const zoomLevel = manualZoom ?? lastZoomLevel
  const containerRef = useRef<HTMLDivElement>(null)
  // Ref so keydown/keyup closures always see the latest hover state without re-registering
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

  // Non-passive wheel listener so preventDefault can suppress page scroll while zooming
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.5 : -0.5
      setManualZoom((prev) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (prev ?? lastZoomLevel) + delta))
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

  // Position popup to the right of cursor, clamped to viewport bounds
  const vw = window.innerWidth
  const vh = window.innerHeight
  let popupLeft = clientPos.x + POPUP_OFFSET
  let popupTop = clientPos.y - ZOOM_PREVIEW_HEIGHT / 2
  if (popupLeft + ZOOM_PREVIEW_WIDTH > vw) popupLeft = clientPos.x - ZOOM_PREVIEW_WIDTH - POPUP_OFFSET
  if (popupTop < 4) popupTop = 4
  if (popupTop + ZOOM_PREVIEW_HEIGHT > vh - 4) popupTop = vh - ZOOM_PREVIEW_HEIGHT - 4

  // Offset the zoomed image so the point under the cursor maps to the preview center
  const imgLeft = ZOOM_PREVIEW_WIDTH / 2 - mousePos.x * zoomLevel
  const imgTop = ZOOM_PREVIEW_HEIGHT / 2 - mousePos.y * zoomLevel

  const tagClicked = async (tag: TagEntry) => {
    const isIncluded = photo.tags.includes(tag.tag)
    const url = isIncluded
      ? `${baseUrl}/photos/removeTags`
      : `${baseUrl}/photos/addTags`
    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    const updatedPhoto = {
      ...photo,
      tags: isIncluded
        ? tagsArray.filter((t) => t !== tag.tag).join(",")
        : [...tagsArray, tag.tag].join(","),
    }

    await fetch(url, {
      body: JSON.stringify([{ photoId: photo.id, tags: [tag.tag] }]),
      method: "PATCH",
      headers: myHeaders,
    })

    onPhotoUpdated(updatedPhoto)
  }

  const openInTab = () => {
    window.open(`${baseUrl}/photos/full/${photo.id}`, "_blank")
  }

  const navigate = () => {
    if (onNavigation) {
      onNavigation(photo)
    }
  }

  const date = parseISO(photo.referenceDate)
  const popupIcon = "ph-arrow-square-out"
  const navigateIcon = "ph-gps-fix"

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: `${photo.thumbnailWidth * scale}px`,
        height: `${photo.thumbnailHeight * scale}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        className="h-auto rounded-lg object-cover shadow-slate-600 shadow-md"
        key={`${photo.id}`}
        loading="lazy"
        src={`${baseUrl}/photos/thumbnail/${photo.id}`}
        width={photo.thumbnailWidth * scale}
        height={photo.thumbnailHeight * scale}
      />
      {showTags && (
        <div className="absolute top-2 left-2 text-2xl cursor-pointer ">
          {definedTags.map((dt) => (
            <Tooltip key={`photo-${photo.id}-tag-tooltip-${dt.tag}`}>
              <TooltipTrigger asChild>
                <i
                  key={`photo-${photo.id}-tag-${dt.tag}`}
                  className={`${
                    tagsArray.includes(dt.tag) ? "ph-fill" : "ph-duotone"
                  } ${
                    dt.icon
                  } cursor-pointer bg-white bg-opacity-30 rounded-md`}
                  onClick={() => tagClicked(dt)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {dt.label}{" "}
                  {tagsArray.includes(dt.tag) ? "(selected)" : "(not selected)"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
      {showDate && (
        <div className="absolute bottom-2 left-2 bg-slate-400 bg-opacity-50 text-xs font-extralight p-[1px] rounded-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{format(date, "yyyy/MM/dd")}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{format(date, "yyyy/MM/dd HH:mm:ss")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      {showActions && (
        <i
          className={`ph-duotone ${popupIcon} text-2xl absolute top-2 right-2 cursor-pointer bg-white bg-opacity-30 rounded-md`}
          onClick={() => openInTab()}
        />
      )}
      {showActions && onNavigation && (
        <i
          className={`ph-duotone ${navigateIcon} text-2xl absolute right-2 bottom-2 cursor-pointer bg-white bg-opacity-30 rounded-md`}
          onClick={() => navigate()}
        />
      )}

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
                width: photo.thumbnailWidth * scale * zoomLevel,
                height: photo.thumbnailHeight * scale * zoomLevel,
                left: imgLeft,
                top: imgTop,
                maxWidth: "none",
                maxHeight: "none",
              }}
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
          document.body
        )}
    </div>
  )
}
