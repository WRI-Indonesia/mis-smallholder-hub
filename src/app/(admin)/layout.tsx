"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ChevronRight } from "lucide-react"

// Build a readable breadcrumb from the current pathname
function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  
  const labelMap: Record<string, string> = {
    admin: "Admin",
    dashboard: "Dashboard",
    "master-data": "Master Data",
    farmers: "Data Petani",
    groups: "Kelompok Tani",
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbs = useBreadcrumbs()

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        {/* Admin Top Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="h-5 shrink-0" />
          </div>
          {/* Breadcrumb — left-aligned, full grow */}
          <nav className="flex items-center gap-1 text-sm min-w-0">
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
        </header>
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
