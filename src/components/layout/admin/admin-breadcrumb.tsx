"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { useBreadcrumbOverride } from "./breadcrumb-override"

export function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  
  const labelMap: Record<string, string> = {
    admin: "Admin",
    dashboard: "Dashboard",
    "master-data": "Master Data",
    farmers: "Data Petani",
    groups: "Lembaga Petani",
    parcels: "Data Lahan",
    regions: "Region / Wilayah",
    cms: "CMS",
    news: "Berita",
    knowledge: "Knowledge Management",
    community: "Komunitas",
    pages: "Konfigurasi Halaman",
    tools: "Tools",
    import: "Import Data",
    export: "Export Laporan",
    geo: "Geospatial",
    settings: "Setting",
    users: "User Management",
    roles: "Role & Permission",
    system: "Konfigurasi Sistem",
  }

  return segments.map((seg, idx) => ({
    label: labelMap[seg] ?? seg,
    href: "/" + segments.slice(0, idx + 1).join("/"),
    isLast: idx === segments.length - 1,
  }))
}

export function AdminBreadcrumb() {
  const crumbs = useBreadcrumbs()
  // Halaman detail ber-[id] menyetel label pengganti (kode human-facing)
  // untuk segmen terakhir — CUID di URL tidak informatif (#172).
  const override = useBreadcrumbOverride()
  const breadcrumbs = override
    ? crumbs.map((c) => (c.isLast ? { ...c, label: override } : c))
    : crumbs

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Link href="/admin/dashboard" className="text-muted-foreground hover:text-primary font-medium transition-colors shrink-0">
        AdminPanel
      </Link>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          {crumb.isLast ? (
            <span className="font-semibold text-foreground whitespace-nowrap">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
