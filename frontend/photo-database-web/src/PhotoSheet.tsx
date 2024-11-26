import { useEffect, useRef, useState } from "react"
import { PhotoRecord } from "."
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet"
import { Photo } from "./Photo"
import { ScrollArea, ScrollBar } from "./components/ui/scroll-area"

export type PhotoSheetProps = {
  photos: PhotoRecord[]
  selectedPhoto: PhotoRecord | undefined
  onPhotoUpdated: (photo: PhotoRecord) => void
  onClose: () => void
}
export function PhotoSheet({
  photos,
  selectedPhoto,
  onClose,
  onPhotoUpdated,
}: PhotoSheetProps) {
  const [photosInRange, setPhotosInRange] = useState<PhotoRecord[]>([])
  const size = 5
  const selectedPhotoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const index = photos.findIndex((p) => p.id === selectedPhoto?.id)
    if (index > -1) {
      const indexStart = Math.max(0, index - size)
      const indexEnd = Math.min(photos.length, index + size)
      const selected = photos.slice(indexStart, indexEnd)
      setPhotosInRange(selected)
    }
  }, [photos, selectedPhoto])

  useEffect(() => {
    // TODO: remove timeout
    setTimeout(() => selectedPhotoRef?.current?.scrollIntoView(), 500)
  }, [selectedPhoto])

  return (
    <Sheet open={!!selectedPhoto} onOpenChange={(open) => !open && onClose()}>
      <SheetTrigger></SheetTrigger>
      <SheetContent
        side={"bottom"}
        onCloseAutoFocus={(ev) => ev.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle></SheetTitle>
        </SheetHeader>
        <SheetDescription>
          <ScrollArea>
            <div className="flex w-max space-x-4 p-4 text-black">
              {photosInRange.map((p) => (
                <div
                  key={`sheet-photo-div-${p.id}`}
                  ref={p.id === selectedPhoto?.id ? selectedPhotoRef : null}
                  className={
                    p.id === selectedPhoto?.id
                      ? "border-2 border-slate-600"
                      : ""
                  }
                >
                  <Photo
                    photo={p}
                    scale={1.0}
                    key={`sheet-photo-${p.id}`}
                    onPhotoUpdated={onPhotoUpdated}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </SheetDescription>
      </SheetContent>
    </Sheet>
  )
}
