import CommunityDirectoryClient from "@/components/community/CommunityDirectoryClient"
import { farmerGroups } from "@/lib/static-data/public/community"

export const metadata = {
  title: "Peta & Direktori Komunitas | Smallholder HUB",
  description: "Eksplorasi ribuan koperasi dan asosiasi petani swadaya dalam ekosistem Riau berkelanjutan.",
}

export default async function CommunityPage() {
  return (
    <CommunityDirectoryClient initialGroups={farmerGroups} />
  )
}
