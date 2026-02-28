import { getMenus } from "@/lib/actions/menu"
import { MenuClient } from "./client"

export default async function MenuPage() {
  const { data, error } = await getMenus()

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-red-500">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Menu Settings</h1>
      </div>
      <MenuClient data={data} />
    </div>
  )
}
