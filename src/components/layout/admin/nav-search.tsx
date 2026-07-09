"use client"

import * as React from "react"

import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SearchIcon, XIcon, ChevronsDownUpIcon } from "lucide-react"

export function NavSearch({
  query,
  setQuery,
  onCollapseAll,
}: {
  query: string
  setQuery: (value: string) => void
  onCollapseAll: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Ctrl/⌘+K focuses the filter; Esc clears it while focused.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault()
                setQuery("")
              }
            }}
            placeholder="Cari menu…"
            aria-label="Cari menu"
            className="h-8 w-full rounded-md border border-input/60 bg-input/30 pr-7 pl-7 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-sidebar-ring/40"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCollapseAll}
          title="Tutup semua menu"
          aria-label="Tutup semua menu"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronsDownUpIcon className="size-4" />
        </button>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
