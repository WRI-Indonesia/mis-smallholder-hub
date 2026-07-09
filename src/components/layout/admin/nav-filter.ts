import type { NavItem } from "@/components/layout/admin/nav-types"

/**
 * Filter the sidebar menu tree by a search query. A node is kept when its own
 * title matches (then all its children are kept for context) or any descendant
 * matches. An empty/blank query returns the input unchanged.
 */
export function filterNavByQuery(items: NavItem[], query: string): NavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items

  const walk = (nodes: NavItem[]): NavItem[] => {
    const out: NavItem[] = []
    for (const item of nodes) {
      const selfMatch = item.title.toLowerCase().includes(q)
      const children = item.items ?? []
      const filteredChildren = selfMatch ? children : walk(children)
      if (selfMatch || filteredChildren.length > 0) {
        out.push({ ...item, items: filteredChildren })
      }
    }
    return out
  }

  return walk(items)
}
