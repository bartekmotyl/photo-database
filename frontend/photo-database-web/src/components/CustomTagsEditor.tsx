import { Fragment, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, Plus, Trash2, type LucideIcon } from "lucide-react"
import {
  CUSTOM_TAGS_STORAGE_KEY,
  ICON_SEARCH_URL,
  customTagProblem,
  loadIcon,
  type StoredCustomTag,
} from "../customTags"

type Row = { tag: string; label: string; icon: string }

const blankRow: Row = { tag: "", label: "", icon: "" }

const trimRow = (row: Row): Row => ({
  tag: row.tag.trim(),
  label: row.label.trim(),
  icon: row.icon.trim(),
})

const isBlank = (row: Row) => !row.tag.trim() && !row.label.trim() && !row.icon.trim()

// Read leniently: entries the loader would reject must still show up here,
// otherwise a typo could never be corrected in the editor.
function storedRows(): Row[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.map((entry) => {
    const { tag, label, icon } = (entry ?? {}) as Partial<StoredCustomTag>
    return {
      tag: typeof tag === "string" ? tag : "",
      label: typeof label === "string" ? label : "",
      icon: typeof icon === "string" ? icon : "",
    }
  })
}

function IconPreview({ name }: { name: string }) {
  const [Icon, setIcon] = useState<LucideIcon | null>(null)

  useEffect(() => {
    let cancelled = false
    setIcon(null)
    loadIcon(name).then((icon) => {
      if (!cancelled) setIcon(() => icon)
    })
    return () => {
      cancelled = true
    }
  }, [name])

  return (
    <span className="grid place-items-center w-7 h-7 rounded-full bg-neutral-100 text-neutral-700">
      {Icon ? <Icon size={15} strokeWidth={2} /> : <span className="text-neutral-300">·</span>}
    </span>
  )
}

const inputClass =
  "h-8 px-2 rounded-md border border-black/10 bg-white text-[12.5px] text-neutral-800 focus:outline-none focus:border-neutral-400"

// Hidden editor for the per-browser tag list - Ctrl+Alt+T.
export function CustomTagsEditor() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [focusRow, setFocusRow] = useState<number | null>(null)
  const tagInputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault()
        setRows(storedRows())
        setShowErrors(false)
        setFocusRow(0)
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (focusRow === null) return
    tagInputs.current[focusRow]?.focus()
    setFocusRow(null)
  }, [focusRow])

  if (!open) return null

  const problemOf = (row: Row, index: number) =>
    isBlank(row)
      ? null
      : customTagProblem(
          trimRow(row),
          rows.filter((_, other) => other !== index).map(trimRow),
        )

  const update = (index: number, field: keyof Row, value: string) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const save = () => {
    const entries = rows.filter((row) => !isBlank(row)).map(trimRow)
    const broken = entries.some((entry, index) =>
      customTagProblem(
        entry,
        entries.filter((_, other) => other !== index),
      ),
    )
    if (broken) {
      setShowErrors(true)
      return
    }
    if (entries.length > 0) {
      const payload: StoredCustomTag[] = entries.map(({ tag, label, icon }) =>
        label ? { tag, label, icon } : { tag, icon },
      )
      localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(payload))
    } else {
      localStorage.removeItem(CUSTOM_TAGS_STORAGE_KEY)
    }
    // Icons are resolved once at startup, so applying the list means reloading.
    location.reload()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div className="w-[620px] max-w-full bg-white rounded-xl shadow-2xl p-4">
        <div className="text-[13px] font-semibold tracking-tight text-neutral-900">
          Custom tags
        </div>
        <div className="text-[11.5px] text-neutral-500 mb-3">
          Stored in this browser only. Find icon names at{" "}
          <a
            href={ICON_SEARCH_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
          >
            lucide.dev/icons
            <ExternalLink size={10} />
          </a>
        </div>

        {rows.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] text-neutral-400">
            No custom tags yet.
          </div>
        ) : (
          <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] gap-x-1.5 gap-y-1 items-center max-h-[50vh] overflow-y-auto">
            <span />
            <span className="text-[11px] font-medium text-neutral-500 px-1">Tag</span>
            <span className="text-[11px] font-medium text-neutral-500 px-1">Label</span>
            <span className="text-[11px] font-medium text-neutral-500 px-1">Icon</span>
            <span />

            {rows.map((row, index) => {
              const problem = showErrors ? problemOf(row, index) : null
              return (
                <Fragment key={index}>
                  <IconPreview name={trimRow(row).icon} />
                  <input
                    ref={(el) => {
                      tagInputs.current[index] = el
                    }}
                    value={row.tag}
                    placeholder="sunset"
                    onChange={(e) => update(index, "tag", e.target.value)}
                    className={inputClass}
                  />
                  <input
                    value={row.label}
                    placeholder="Sunset"
                    onChange={(e) => update(index, "label", e.target.value)}
                    className={inputClass}
                  />
                  <input
                    value={row.icon}
                    placeholder="sunset"
                    spellCheck={false}
                    onChange={(e) => update(index, "icon", e.target.value)}
                    className={inputClass}
                  />
                  <button
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    title="Remove"
                    className="grid place-items-center w-7 h-7 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>

                  {problem && (
                    <span className="col-start-2 col-span-4 text-[11px] text-red-600 px-1 pb-1">
                      {problem}
                    </span>
                  )}
                </Fragment>
              )
            })}
          </div>
        )}

        <div className="flex items-center mt-3">
          <button
            onClick={() => {
              setRows([...rows, blankRow])
              setFocusRow(rows.length)
            }}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-100 transition"
          >
            <Plus size={13} strokeWidth={2} />
            Add tag
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-8 px-3 rounded-full text-[12.5px] font-medium text-neutral-600 hover:bg-neutral-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="h-8 px-3 rounded-full text-[12.5px] font-medium bg-neutral-900 text-white hover:bg-neutral-700 transition"
            >
              Save &amp; reload
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
