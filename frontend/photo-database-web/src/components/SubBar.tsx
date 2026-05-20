type SubBarProps = {
  total: number
  page: number
  pages: number
}

export function SubBar({ total, page, pages }: SubBarProps) {
  return (
    <div className="flex items-center px-5 h-11 text-[12px] text-neutral-500 border-b border-black/[0.04]">
      <span>
        <span className="font-medium text-neutral-700">
          {total.toLocaleString()}
        </span>{" "}
        photos · page {page} of {pages}
      </span>
    </div>
  )
}
