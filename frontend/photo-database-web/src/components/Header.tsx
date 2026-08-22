import { useState } from "react"
import { format, parse } from "date-fns"
import {
  Calendar,
  ChevronDown,
  Heart,
  Layers,
  Minus,
  Plus,
  ArrowUpDown,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { definedTags, TAG_ICON_MAP } from "../index"

type HeaderProps = {
  scale: number
  onScale: (scale: number) => void
  allMonths: string[]
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  tagMatchMode: "all" | "any"
  onTagMatchModeChange: (mode: "all" | "any") => void
  sort: "newest" | "oldest" | "random"
  onSortChange: (sort: "newest" | "oldest" | "random") => void
}

function Chip({
  children,
  active,
  onClick,
  leading,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  leading?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium transition border " +
        (active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white/70 text-neutral-700 border-black/5 hover:bg-white")
      }
    >
      {leading}
      <span>{children}</span>
      <ChevronDown size={12} />
    </button>
  )
}

function IconBtn({
  icon,
  label,
  size = 26,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  size?: number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid place-items-center rounded-full transition text-neutral-700 hover:bg-neutral-200/70"
      style={{ width: size, height: size }}
    >
      {icon}
    </button>
  )
}

function monthLabel(month: string): string {
  return format(parse(month, "yyyy-MM", new Date()), "MMM yyyy")
}

export function Header({
  scale,
  onScale,
  allMonths,
  selectedMonth,
  onMonthChange,
  selectedTags,
  onTagsChange,
  tagMatchMode,
  onTagMatchModeChange,
  sort,
  onSortChange,
}: HeaderProps) {
  const monthChipLabel = selectedMonth ? monthLabel(selectedMonth) : "All months"
  const tagChipLabel =
    selectedTags.length === 0
      ? "Any tag"
      : selectedTags.length === 1
        ? (definedTags.find((t) => t.tag === selectedTags[0])?.label ?? selectedTags[0])
        : `${selectedTags.length} tags`
  const sortLabel =
    sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "Random"

  const [monthOpen, setMonthOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const toggleTag = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag],
    )
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-black/[0.06]">
      <div className="flex items-center gap-3 h-14 px-5">
        {/* Wordmark */}
        <div className="flex items-center gap-2 mr-2 shrink-0">
          <span className="grid place-items-center w-7 h-7 rounded-[7px] bg-neutral-900 text-white">
            <Layers size={15} strokeWidth={2} />
          </span>
          <span className="font-semibold tracking-tight text-[14px] text-neutral-900">
            Photos
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {/* Month chip */}
          <Popover open={monthOpen} onOpenChange={setMonthOpen}>
            <PopoverTrigger asChild>
              <span>
                <Chip
                  active={!!selectedMonth}
                  leading={<Calendar size={13} />}
                >
                  {monthChipLabel}
                </Chip>
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1 max-h-72 overflow-y-auto overscroll-contain" align="start">
              <button
                onClick={() => { onMonthChange(null); setMonthOpen(false) }}
                className={
                  "w-full text-left px-3 py-1.5 text-[12.5px] rounded-md transition " +
                  (!selectedMonth
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100")
                }
              >
                All months
              </button>
              {allMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => { onMonthChange(m); setMonthOpen(false) }}
                  className={
                    "w-full text-left px-3 py-1.5 text-[12.5px] rounded-md transition " +
                    (selectedMonth === m
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100")
                  }
                >
                  {monthLabel(m)}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Tag chip */}
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <span>
                <Chip
                  active={selectedTags.length > 0}
                  leading={<Heart size={13} />}
                >
                  {tagChipLabel}
                </Chip>
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              <div className="flex items-center gap-0.5 p-0.5 mb-1 bg-neutral-100 rounded-md">
                {(["all", "any"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onTagMatchModeChange(mode)}
                    className={
                      "flex-1 px-2 py-1 text-[11.5px] font-medium rounded transition " +
                      (tagMatchMode === mode
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700")
                    }
                  >
                    {mode === "all" ? "All tags" : "Any tag"}
                  </button>
                ))}
              </div>
              {definedTags.map((dt) => {
                const IconComp = TAG_ICON_MAP[dt.tag]
                const on = selectedTags.includes(dt.tag)
                return (
                  <button
                    key={dt.tag}
                    onClick={() => { toggleTag(dt.tag); setTagOpen(false) }}
                    className={
                      "w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] rounded-md transition " +
                      (on
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100")
                    }
                  >
                    {IconComp && <IconComp size={13} strokeWidth={2} />}
                    <span className="flex-1 text-left">{dt.label}</span>
                    {on && (
                      <span className="text-[10px] opacity-70">✓</span>
                    )}
                  </button>
                )
              })}
              <div className="my-1 border-t border-black/5" />
              <button
                onClick={() => { onTagsChange([]); setTagOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] rounded-md text-neutral-500 hover:bg-neutral-100 transition"
              >
                Clear filter
              </button>
            </PopoverContent>
          </Popover>

          {/* Sort chip */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <span>
                <Chip leading={<ArrowUpDown size={13} />}>{sortLabel}</Chip>
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {(["newest", "oldest", "random"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { onSortChange(s); setSortOpen(false) }}
                  className={
                    "w-full text-left px-3 py-1.5 text-[12.5px] rounded-md transition capitalize " +
                    (sort === s
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100")
                  }
                >
                  {s === "newest"
                    ? "Newest first"
                    : s === "oldest"
                      ? "Oldest first"
                      : "Random"}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Scale stepper */}
          <div className="flex items-center h-8 rounded-full bg-neutral-100 px-1 gap-0.5">
            <IconBtn
              icon={<Minus size={13} />}
              label="Smaller"
              onClick={() => onScale(Math.max(2, scale - 1))}
            />
            <span className="text-[11px] tabular-nums text-neutral-500 px-1 w-5 text-center">
              {scale}
            </span>
            <IconBtn
              icon={<Plus size={13} />}
              label="Larger"
              onClick={() => onScale(Math.min(11, scale + 1))}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
