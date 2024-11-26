import { useEffect, useRef, useState } from "react"
import "./App.css"
import { useAsync, useLocalStorage } from "react-use"
import { Slider } from "./components/ui/slider"
import * as lodash from "lodash"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "./components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select"
import { baseUrl, definedTags, PhotoRecord } from "."
import { Photo } from "./Photo"
import { PhotoSheet } from "./PhotoSheet"
import { Label } from "./components/ui/label"
import { Card, CardContent } from "./components/ui/card"
import { Button } from "./components/ui/button"

function App() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const photosState = useAsync(async () => {
    const response = await fetch(`${baseUrl}/photos/all`)
    const result = (await response.json()) as PhotoRecord[]
    const sorted = lodash.sortBy(result, (r) => r.referenceDate)
    console.log("setting photos from async call")
    setPhotos(sorted)
    return sorted
  }, [])
  const defaultScale = 1.0
  const [scaleSaved, setScaleSaved] = useLocalStorage("scale", defaultScale)
  const scale = scaleSaved ?? defaultScale
  const pageSizes = [10, 50, 100, 200, 500, 1000]
  const defaultPageSize = 100
  const [pageSizeSaved, setPageSizeSaved] = useLocalStorage(
    "pageSize",
    defaultPageSize
  )
  const pageSize = pageSizeSaved ?? defaultPageSize
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [photoToNavigate, setPhotoToNavigate] = useState<
    PhotoRecord | undefined
  >()
  const [hideNavBar, setHideNavBar] = useState<boolean | undefined>(undefined)

  const scrollRef = useRef<HTMLDivElement>(null)
  const navBarRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!scrollRef.current) {
      return
    }
    if (
      hideNavBar == undefined &&
      scrollRef.current?.scrollTop > (navBarRef.current?.clientHeight ?? 0)
    ) {
      setHideNavBar(true)
    }
  }
  useEffect(() => {
    const element = scrollRef.current
    element?.addEventListener("scroll", handleScroll)

    return () => element?.removeEventListener("scroll", handleScroll)
  })

  const onPhotoUpdated = (updatedPhoto: PhotoRecord) => {
    console.log(`onPhotoUpdated: ${updatedPhoto.id}`)
    const newPhotos = photos.map((p) => {
      if (p.id === updatedPhoto.id) {
        return updatedPhoto
      } else {
        return p
      }
    })
    setPhotos(newPhotos)
  }
  const onPhotoNavigation = (photo: PhotoRecord) => {
    setPhotoToNavigate(photo)
  }
  const navigateToPage = (pageIndex: number) => {
    setCurrentPageIndex(pageIndex)
  }

  const allMonths = lodash.sortBy(
    lodash.uniq(photos.map((p) => p.referenceDate.substring(0, 7))),
    (m) => m
  )

  let filteredPhotos = photos

  if (selectedMonth) {
    filteredPhotos = filteredPhotos.filter((p) =>
      p.referenceDate.startsWith(selectedMonth)
    )
  }
  if (selectedTag) {
    filteredPhotos = filteredPhotos.filter((p) => p.tags.includes(selectedTag))
  }

  const numPages = Math.ceil(filteredPhotos.length / pageSize)
  // const pagesNavStart = Math.max(currentPageIndex - 5, 0)
  // const pagesNavEnd = Math.min(currentPageIndex + 5, numPages)
  const pagesNavStartIndex = Math.max(currentPageIndex, 0)
  const pagesNavEndIndex = Math.min(currentPageIndex - 1, numPages)

  const photosOnPage = filteredPhotos.slice(
    currentPageIndex * pageSize,
    (currentPageIndex + 1) * pageSize
  )

  if (photosOnPage.length === 0 && currentPageIndex > 0) {
    setCurrentPageIndex(0)
  }

  useEffect(
    () => window.scrollTo({ top: 0, behavior: "smooth" }),
    [pageSizeSaved, currentPageIndex, selectedTag, selectedMonth, scaleSaved]
  )

  const MonthSelector = () => (
    <Select
      defaultValue={selectedMonth ?? undefined}
      onValueChange={(value) =>
        setSelectedMonth(value !== "_none_" ? value : null)
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Month" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={"_none_"} key={`select-month-none`} className="">
          All
        </SelectItem>
        {allMonths.map((month) => (
          <SelectItem value={`${month}`} key={`select-month-${month}`}>
            {month}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const Paginator = () => (
    <Pagination>
      <PaginationContent>
        {currentPageIndex > 0 && (
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={() => navigateToPage(currentPageIndex - 1)}
            />
          </PaginationItem>
        )}
        {lodash.range(pagesNavStartIndex, pagesNavEndIndex).map((pageIndex) => (
          <PaginationItem key={`pagination-item-${pageIndex}`}>
            <PaginationLink
              href="#"
              isActive={pageIndex === currentPageIndex}
              onClick={() => navigateToPage(pageIndex)}
            >
              {pageIndex + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        {currentPageIndex < numPages - 1 && (
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={() => navigateToPage(currentPageIndex + 1)}
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )

  const PageSizeSelector = () => {
    return (
      // <ToggleGroup
      //   type="single"
      //   size="sm"
      //   value={pageSize.toString()}
      //   onValueChange={(value) => setPageSizeSaved(lodash.toInteger(value))}
      //   className=""
      // >
      //   {pageSizes.map((size) => (
      //     <ToggleGroupItem
      //       value={`${size}`}
      //       key={`page-size-${size}`}
      //       aria-label="Toggle bold"
      //     >
      //       {size}
      //     </ToggleGroupItem>
      //   ))}
      // </ToggleGroup>

      <Select
        defaultValue={pageSize.toString()}
        onValueChange={(value) => setPageSizeSaved(lodash.toInteger(value))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Page size" />
        </SelectTrigger>
        <SelectContent>
          {pageSizes.map((size) => (
            <SelectItem value={`${size}`} key={`page-size-${size}`}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const TagFilter = () => (
    <Select
      defaultValue={selectedTag ?? undefined}
      onValueChange={(value) =>
        setSelectedTag(value !== "_none_" ? value : null)
      }
    >
      <SelectTrigger className="">
        <SelectValue placeholder="Tag" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={"_none_"} key={`select-tag-none`}>
          All
        </SelectItem>
        {definedTags.map((tag) => (
          <SelectItem value={`${tag.tag}`} key={`select-tag-${tag.tag}`}>
            {tag.label} ({tag.tag})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const NavBarSwitch = () => {
    return (
      <div className="border-2 border-slate-400  bg-slate-300 opacity-50 absolute top-0 right-0 z-[60] p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setHideNavBar((hideNavBar) => !hideNavBar)}
        >
          <i
            className={`ph ${
              hideNavBar
                ? "ph-arrow-square-down-left"
                : "ph-arrow-square-up-right"
            } text-4xl`}
          ></i>
        </Button>
      </div>
    )
  }
  return (
    <div className="w-full h-lvh overflow-auto scroll-smooth" ref={scrollRef}>
      <NavBarSwitch />
      {!hideNavBar && (
        <nav className="sticky top-0 z-50 p-2" ref={navBarRef}>
          <Card className="w-full">
            <CardContent className="pb-0">
              <div className="grid grid-cols-[minmax(0,_150px)_minmax(0,_300px)] gap-1 py-2 items-center place-items-start">
                <Label htmlFor="name" className="">
                  Page size
                </Label>
                <PageSizeSelector />
                <Label htmlFor="name" className="">
                  Month
                </Label>
                <MonthSelector />
                <Label htmlFor="name" className="">
                  Tag
                </Label>
                <TagFilter />
                <div className="flex flex-row gap-2 w-full col-span-2 items-center">
                  <div>Scale</div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => scale > 0.2 && setScaleSaved(scale - 0.1)}
                  >
                    -
                  </Button>
                  <Slider
                    className=""
                    value={[scale]}
                    min={0.2}
                    max={1.5}
                    step={0.1}
                    onValueChange={(v) => setScaleSaved(v[0])}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => scale < 1.5 && setScaleSaved(scale + 0.1)}
                  >
                    +
                  </Button>
                </div>
                <div className="col-span-2">
                  {filteredPhotos.length} photos, {numPages} page(s)
                </div>
              </div>
            </CardContent>
          </Card>
        </nav>
      )}
      <main className="flex flex-row flex-wrap gap-4 justify-center p-2">
        <Paginator />
        {photosState.loading ? (
          <div>Loading...</div>
        ) : photosState.error ? (
          <div>Error: {photosState.error.message}</div>
        ) : (
          photosOnPage.map((photo) => (
            <Photo
              key={photo.id}
              photo={photo}
              scale={scale}
              onPhotoUpdated={onPhotoUpdated}
              onNavigation={onPhotoNavigation}
            />
          ))
        )}
        <Paginator />
      </main>

      <PhotoSheet
        photos={photos}
        selectedPhoto={photoToNavigate}
        onClose={() => {
          setPhotoToNavigate(undefined)
        }}
        onPhotoUpdated={onPhotoUpdated}
      />
    </div>
  )
}

export default App
