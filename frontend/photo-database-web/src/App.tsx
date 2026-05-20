import { useEffect, useState } from "react"
import "./App.css"
import { useAsync, useLocalStorage } from "react-use"
import * as lodash from "lodash"
import { baseUrl, PhotoRecord, parseTags } from "."
import { PhotoSheet } from "./PhotoSheet"
import { Header } from "./components/Header"
import { SubBar } from "./components/SubBar"
import { JustifiedGrid } from "./components/JustifiedGrid"
import { PaginationStrip } from "./components/PaginationStrip"

type SortOrder = "newest" | "oldest" | "random"

const ROW_HEIGHT_MAP: Record<number, number> = {
  2: 110,
  3: 140,
  4: 175,
  5: 210,
  6: 250,
  7: 300,
  8: 360,
  9: 480,
  10: 640,
  11: 860,
}

function App() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([])

  useAsync(async () => {
    const response = await fetch(`${baseUrl}/photos/all`)
    const result = (await response.json()) as PhotoRecord[]
    const sorted = lodash.sortBy(result, (r) => r.referenceDate)
    setPhotos(sorted)
    return sorted
  }, [])

  const [scaleSaved, setScaleSaved] = useLocalStorage<number>("scale-v2", 5)
  const scale = scaleSaved ?? 5

  const [pageSizeSaved] = useLocalStorage<number>("pageSize", 100)
  const pageSize = pageSizeSaved ?? 100

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sort, setSort] = useState<SortOrder>("newest")
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoRecord | undefined>()

  const allMonths = lodash.sortBy(
    lodash.uniq(photos.map((p) => p.referenceDate.substring(0, 7))),
    (m) => m,
  )

  let filteredPhotos = photos

  if (selectedMonth) {
    filteredPhotos = filteredPhotos.filter((p) =>
      p.referenceDate.startsWith(selectedMonth),
    )
  }

  if (selectedTags.length > 0) {
    filteredPhotos = filteredPhotos.filter((p) => {
      const tags = parseTags(p.tags)
      return selectedTags.some((t) => tags.includes(t))
    })
  }

  if (sort === "oldest") {
    filteredPhotos = lodash.sortBy(filteredPhotos, (p) => p.referenceDate)
  } else if (sort === "newest") {
    filteredPhotos = lodash.sortBy(
      filteredPhotos,
      (p) => p.referenceDate,
    ).reverse()
  } else if (sort === "random") {
    filteredPhotos = lodash.shuffle(filteredPhotos)
  }

  const numPages = Math.max(1, Math.ceil(filteredPhotos.length / pageSize))

  const photosOnPage = filteredPhotos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedTags.join(","), sort])

  // Clamp page if filtered result shrinks
  useEffect(() => {
    if (currentPage > numPages) setCurrentPage(numPages)
  }, [numPages, currentPage])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentPage])

  const onPhotoUpdated = (updatedPhoto: PhotoRecord) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)),
    )
    // If the updated photo is the one in the lightbox, update it too
    setLightboxPhoto((prev) =>
      prev?.id === updatedPhoto.id ? updatedPhoto : prev,
    )
  }

  const targetRowHeight = ROW_HEIGHT_MAP[scale] ?? 210

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <Header
        scale={scale}
        onScale={setScaleSaved}
        allMonths={allMonths}
        selectedMonth={selectedMonth}
        onMonthChange={(m) => setSelectedMonth(m)}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        sort={sort}
        onSortChange={setSort}
      />

      <SubBar
        total={filteredPhotos.length}
        page={currentPage}
        pages={numPages}
      />

      <main className="px-5 pt-4 pb-2">
        {photosOnPage.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-neutral-400 text-[13px]">
            No photos match the current filters.
          </div>
        ) : (
          <JustifiedGrid
            photos={photosOnPage}
            targetHeight={targetRowHeight}
            gap={6}
            onOpen={setLightboxPhoto}
            onPhotoUpdated={onPhotoUpdated}
          />
        )}
      </main>

      <PaginationStrip
        page={currentPage}
        pages={numPages}
        onPage={setCurrentPage}
      />

      <PhotoSheet
        photos={filteredPhotos}
        selectedPhoto={lightboxPhoto}
        onClose={() => setLightboxPhoto(undefined)}
        onNavigate={setLightboxPhoto}
        onPhotoUpdated={onPhotoUpdated}
      />
    </div>
  )
}

export default App
