type SubBarProps = {
  total: number
  page: number
  pages: number
  loading?: boolean
}

export function SubBar({ total, page, pages, loading }: SubBarProps) {
  return (
    <div className="flex items-center px-5 h-11 text-[12px] text-neutral-500 border-b border-black/[0.04]">
      {loading ? (
        <span>Loading photos…</span>
      ) : (
        <span>
          <span className="font-medium text-neutral-700">
            {total.toLocaleString()}
          </span>{" "}
          photos · page {page} of {pages}
        </span>
      )}
    </div>
  )
}
