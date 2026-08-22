import { useRef, useState, useLayoutEffect, useMemo } from "react"
import { photoRatio, PhotoRecord } from "../index"
import { Photo } from "../Photo"

type JustifiedGridProps = {
  photos: PhotoRecord[]
  targetHeight: number
  gap?: number
  onOpen?: (photo: PhotoRecord) => void
  onPhotoUpdated: (photo: PhotoRecord) => void
}

export function JustifiedGrid({
  photos,
  targetHeight,
  gap = 6,
  onOpen,
  onPhotoUpdated,
}: JustifiedGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // useLayoutEffect so width is measured before the first browser paint —
  // prevents the flash of empty boxes that useEffect would cause.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width
        if (w > 0) setWidth(w)
      }
    })
    ro.observe(el)
    const w = el.getBoundingClientRect().width
    if (w > 0) setWidth(w)
    return () => ro.disconnect()
  }, [])

  const rows = useMemo(() => {
    if (!width || !photos.length) return []
    const out: Array<{
      items: Array<{ photo: PhotoRecord; w: number; h: number }>
      h: number
    }> = []
    let row: PhotoRecord[] = []
    let widthAtTarget = 0

    for (const p of photos) {
      const r = photoRatio(p)
      const w = targetHeight * r
      row.push(p)
      widthAtTarget += w
      const totalGap = gap * (row.length - 1)
      if (widthAtTarget + totalGap >= width) {
        const scale = (width - totalGap) / widthAtTarget
        const h = targetHeight * scale
        out.push({
          items: row.map((p2) => ({
            photo: p2,
            w: targetHeight * photoRatio(p2) * scale,
            h,
          })),
          h,
        })
        row = []
        widthAtTarget = 0
      }
    }

    if (row.length) {
      const h = targetHeight
      out.push({
        items: row.map((p2) => ({
          photo: p2,
          w: targetHeight * photoRatio(p2),
          h,
        })),
        h,
      })
    }

    return out
  }, [photos, width, targetHeight, gap])

  return (
    <div ref={ref} className="flex flex-col" style={{ gap }}>
      {rows.map((row, i) => (
        <div key={i} className="flex" style={{ gap, height: row.h }}>
          {row.items.map(({ photo, w, h }) => (
            <div
              key={photo.id}
              style={{ width: w, height: h, flex: "0 0 auto" }}
            >
              <Photo
                photo={photo}
                renderWidth={w}
                renderHeight={h}
                dense={h < 130}
                onOpen={onOpen}
                onPhotoUpdated={onPhotoUpdated}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
