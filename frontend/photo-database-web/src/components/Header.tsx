import { useState } from "react"
import { format, parse } from "date-fns"
import {
  Calendar,
  ChevronDown,
  Heart,
  Layers,
  LayoutGrid,
  Minus,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { definedTags, TAG_ICON_MAP } from "../index"
import { CUSTOM_TAG_ICON_MAP, customTags } from "../customTags"

type HeaderProps = {
  scale: number
  onScale: (scale: number) => void
  allMonths: string[]
  allTags: string[]
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  tagMatchMode: "all" | "any"
  onTagMatchModeChange: (mode: "all" | "any") => void
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  minScore: number
  onMinScoreChange: (minScore: number) => void
  minScore1: number
  onMinScore1Change: (minScore1: number) => void
  orientation: Orientation
  onOrientationChange: (orientation: Orientation) => void
}

type Orientation = "any" | "landscape" | "portrait"

type SortOption = "newest" | "oldest" | "random" | "score0" | "score1"

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  random: "Random",
  score0: "Aesthetic score",
  score1: "Evaluation score",
}

// Slider chip with -/+ buttons for fine tuning. 0 means "no filter".
function ScoreSlider({
  icon,
  label,
  max,
  step,
  value,
  onChange,
}: {
  icon: string
  label: string
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  const decimals = step < 1 ? 1 : 0
  const nudge = (direction: number) => {
    const next = Math.min(max, Math.max(0, value + direction * step))
    onChange(parseFloat(next.toFixed(decimals)))
  }
  return (
    <div
      className={
        "flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] font-medium border " +
        (value > 0
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white/70 text-neutral-700 border-black/5")
      }
      title={label}
    >
      <span>{icon}</span>
      <button onClick={() => nudge(-1)} className="px-0.5 opacity-70 hover:opacity-100">−</button>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 accent-neutral-900"
      />
      <button onClick={() => nudge(1)} className="px-0.5 opacity-70 hover:opacity-100">+</button>
      <span className="w-8 tabular-nums text-right">
        {value > 0 ? value.toFixed(decimals) : "any"}
      </span>
    </div>
  )
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

function TagOption({
  label,
  icon: IconComp,
  on,
  onClick,
}: {
  label: string
  icon?: LucideIcon
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] rounded-md transition " +
        (on ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100")
      }
    >
      {IconComp && <IconComp size={13} strokeWidth={2} />}
      <span className="flex-1 text-left">{label}</span>
      {on && <span className="text-[10px] opacity-70">✓</span>}
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
  allTags,
  selectedMonth,
  onMonthChange,
  selectedTags,
  onTagsChange,
  tagMatchMode,
  onTagMatchModeChange,
  sort,
  onSortChange,
  minScore,
  onMinScoreChange,
  minScore1,
  onMinScore1Change,
  orientation,
  onOrientationChange,
}: HeaderProps) {
  const monthChipLabel = selectedMonth ? monthLabel(selectedMonth) : "All months"
  const tagChipLabel =
    selectedTags.length === 0
      ? "Any tag"
      : selectedTags.length === 1
        ? ([...definedTags, ...customTags].find((t) => t.tag === selectedTags[0])?.label ??
          selectedTags[0])
        : `${selectedTags.length} tags`
  const sortLabel = SORT_LABELS[sort]

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

  // Tags found in the collection that are not among the predefined ones
  // (e.g. ai-* tags written by the labeler) - filterable, rendered without icons.
  const extraTags = allTags.filter(
    (tag) =>
      !definedTags.some((dt) => dt.tag === tag) &&
      !customTags.some((ct) => ct.tag === tag),
  )

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
            <PopoverContent
              className="w-48 p-1 max-h-96 overflow-y-auto overscroll-contain"
              align="start"
            >
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
              {definedTags.map((dt) => (
                <TagOption
                  key={dt.tag}
                  label={dt.label}
                  icon={TAG_ICON_MAP[dt.tag]}
                  on={selectedTags.includes(dt.tag)}
                  onClick={() => { toggleTag(dt.tag); setTagOpen(false) }}
                />
              ))}
              {customTags.length > 0 && (
                <div className="my-1 border-t border-black/5" />
              )}
              {customTags.map((ct) => (
                <TagOption
                  key={ct.tag}
                  label={ct.label}
                  icon={CUSTOM_TAG_ICON_MAP[ct.tag]}
                  on={selectedTags.includes(ct.tag)}
                  onClick={() => { toggleTag(ct.tag); setTagOpen(false) }}
                />
              ))}
              {extraTags.length > 0 && (
                <div className="my-1 border-t border-black/5" />
              )}
              {extraTags.map((tag) => (
                <TagOption
                  key={tag}
                  label={tag}
                  on={selectedTags.includes(tag)}
                  onClick={() => { toggleTag(tag); setTagOpen(false) }}
                />
              ))}
              <div className="my-1 border-t border-black/5" />
              <button
                onClick={() => { onTagsChange([]); setTagOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] rounded-md text-neutral-500 hover:bg-neutral-100 transition"
              >
                Clear filter
              </button>
            </PopoverContent>
          </Popover>

          <ScoreSlider
            icon="★"
            label="Minimum aesthetic score, slot 0 (photos without a score are hidden when > 0)"
            max={10}
            step={0.1}
            value={minScore}
            onChange={onMinScoreChange}
          />
          <ScoreSlider
            icon="✦"
            label="Minimum evaluation score, slot 1 (photos without one are hidden when > 0)"
            max={100}
            step={1}
            value={minScore1}
            onChange={onMinScore1Change}
          />

          {/* Orientation filter: any / landscape / portrait (exclusive) */}
          <div
            className={
              "flex items-center h-8 px-1 gap-0.5 rounded-full border " +
              (orientation !== "any"
                ? "bg-neutral-900 border-neutral-900"
                : "bg-white/70 border-black/5")
            }
          >
            {(
              [
                ["any", LayoutGrid, "Any orientation"],
                ["landscape", RectangleHorizontal, "Landscape only"],
                ["portrait", RectangleVertical, "Portrait only"],
              ] as const
            ).map(([value, IconComp, label]) => (
              <button
                key={value}
                title={label}
                aria-label={label}
                onClick={() => onOrientationChange(value)}
                className={
                  "grid place-items-center w-6 h-6 rounded-full transition " +
                  (orientation === value
                    ? orientation !== "any"
                      ? "bg-white text-neutral-900"
                      : "bg-neutral-900 text-white"
                    : orientation !== "any"
                      ? "text-white/60 hover:bg-white/15"
                      : "text-neutral-500 hover:bg-neutral-200/70")
                }
              >
                <IconComp size={13} strokeWidth={2} />
              </button>
            ))}
          </div>

          {/* Sort chip */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <span>
                <Chip leading={<ArrowUpDown size={13} />}>{sortLabel}</Chip>
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { onSortChange(s); setSortOpen(false) }}
                  className={
                    "w-full text-left px-3 py-1.5 text-[12.5px] rounded-md transition " +
                    (sort === s
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100")
                  }
                >
                  {SORT_LABELS[s]}
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
