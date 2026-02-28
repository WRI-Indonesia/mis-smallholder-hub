import { getRegionalTreeLevel } from "@/lib/actions/regional-tree"
import { RegionalTreeClient } from "./client"

export default async function RegionalPage() {
  const { data: initialProvinces, error } = await getRegionalTreeLevel("province")

  if (error) {
    return (
      <div className="flex z-10 flex-col items-center justify-center p-6 text-red-500 w-full h-[50vh]">
        <h2 className="text-xl font-bold mb-2">Error Loading Regional Data</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div>
         <h1 className="text-2xl font-semibold tracking-tight">Regional Master Data</h1>
         <p className="text-sm text-muted-foreground mt-1">
            Manage your Provinces, Districts, Sub-Districts, and Villages in a unified hierarchical view.
         </p>
      </div>
      
      {/* 
        This is a Next Server Component passing the top level Provinces down. 
        The Client Component handles lazy-loading any children recursively.
      */}
      <RegionalTreeClient initialProvinces={(initialProvinces as any[]) || []} />
    </div>
  )
}
