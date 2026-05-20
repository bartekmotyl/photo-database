import { ChevronLeft, ChevronRight } from "lucide-react"

type PaginationStripProps = {
  page: number // 1-indexed
  pages: number
  onPage: (page: number) => void
}

function buildPageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1)
  }

  const candidates: (number | "…")[] = [
    1, 2, 3, "…", page - 1, page, page + 1, "…", pages - 1, pages,
  ]

  const seen = new Set<number | "…">()
  const unique = candidates.filter((v) => {
    if (v === "…") return true
    if (typeof v === "number" && (v < 1 || v > pages)) return false
    if (seen.has(v)) return false
    seen.add(v)
    return true
  })

  // Remove ellipses that sit right next to consecutive numbers
  const result: (number | "…")[] = []
  for (let i = 0; i < unique.length; i++) {
    const prev = unique[i - 1]
    const curr = unique[i]
    const next = unique[i + 1]
    if (curr === "…") {
      if (
        typeof prev === "number" &&
        typeof next === "number" &&
        next - prev === 2
      ) {
        // Ellipsis between n and n+2 — just emit the middle number
        result.push(prev + 1)
      } else if (
        typeof prev !== "number" ||
        typeof next !== "number" ||
        next - prev > 1
      ) {
        result.push(curr)
      }
    } else {
      result.push(curr)
    }
  }

  return result
}

export function PaginationStrip({ page, pages, onPage }: PaginationStripProps) {
  if (pages <= 1) return null
  const nums = buildPageNumbers(page, pages)

  return (
    <div className="flex items-center justify-center gap-1 py-5">
      <button
        onClick={() => page > 1 && onPage(page - 1)}
        disabled={page <= 1}
        className="h-8 px-3 inline-flex items-center gap-1 rounded-full text-[12.5px] text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        <ChevronLeft size={13} /> Prev
      </button>

      {nums.map((n, i) =>
        n === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="min-w-8 h-8 px-2.5 grid place-items-center text-[12.5px] text-neutral-500"
          >
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={
              "min-w-8 h-8 px-2.5 rounded-full text-[12.5px] tabular-nums transition " +
              (n === page
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-200/60")
            }
          >
            {n}
          </button>
        ),
      )}

      <button
        onClick={() => page < pages && onPage(page + 1)}
        disabled={page >= pages}
        className="h-8 px-3 inline-flex items-center gap-1 rounded-full text-[12.5px] text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        Next <ChevronRight size={13} />
      </button>
    </div>
  )
}
