import { Metadata } from "next"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/admin/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminHeaderActions } from "@/components/layout/admin/admin-header-actions"
import { AdminBreadcrumb } from "@/components/layout/admin/admin-breadcrumb"

export const metadata: Metadata = {
  title: {
    template: "%s | Admin - Smallholder HUB",
    default: "Admin - Smallholder HUB",
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        {/* Admin Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="h-5 shrink-0" />
            <AdminBreadcrumb />
          </div>
          <AdminHeaderActions />
        </header>
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
