import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, ThumbsUp } from "lucide-react"

export default function CommunityPage() {
  const posts = [
    { id: 1, author: "Budi Santoso", title: "Cara efektif mengatasi hama wereng?", replies: 12, likes: 24, time: "2 jam yang lalu" },
    { id: 2, author: "Siti Aminah", title: "Jadwal pengambilan pupuk subsidi bulan ini", replies: 5, likes: 10, time: "5 jam yang lalu" },
    { id: 3, author: "Kelompok Tani Maju", title: "Penyuluhan teknik irigasi tetes (Drip Irrigation)", replies: 8, likes: 30, time: "1 hari yang lalu" },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">Komunitas Petani</h1>
          <p className="mt-2 text-muted-foreground">Diskusi, tanya jawab, dan berbagi informasi seputar pertanian.</p>
        </div>
        <Button className="font-semibold shadow-sm">Buat Diskusi Baru</Button>
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="text-xl text-primary">{post.title}</CardTitle>
              <CardDescription className="text-sm">Ditulis oleh <span className="font-semibold text-foreground">{post.author}</span> • {post.time}</CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-6 text-muted-foreground pt-0">
              <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                <ThumbsUp className="w-5 h-5" />
                <span className="text-sm font-medium">{post.likes} Suka</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-medium">{post.replies} Balasan</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
