import { format, parseISO } from "date-fns"
import { baseUrl, definedTags, PhotoRecord, TagEntry } from "."
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip"
import { useState } from "react"

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
      className="relative"
      style={{
        width: `${photo.thumbnailWidth * scale}px`,
        height: `${photo.thumbnailHeight * scale}px`,
      }}
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
        <div className="absolute bottom-2 left-2 bg-slate-400 bg-opacity-50 text-xs font-extralight  p-[1px] rounded-md">
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
          className={`ph-duotone ${popupIcon} text-2xl absolute top-2 right-2 cursor-pointer  bg-white bg-opacity-30 rounded-md`}
          onClick={() => openInTab()}
        />
      )}
      {showActions && onNavigation && (
        <i
          className={`ph-duotone ${navigateIcon} text-2xl absolute right-2 bottom-2 cursor-pointer  bg-white bg-opacity-30 rounded-md`}
          onClick={() => navigate()}
        />
      )}
    </div>
  )
}
