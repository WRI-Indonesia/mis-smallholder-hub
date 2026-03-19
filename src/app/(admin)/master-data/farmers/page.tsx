import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Search, Edit, Trash2 } from "lucide-react"

export default function MasterDataFarmersPage() {
  const mockFarmers = [
    { id: "PET-001", name: "Budi Santoso", nik: "320101...", group: "Tani Maju", region: "Desa Suka Makmur" },
    { id: "PET-002", name: "Siti Aminah", nik: "320102...", group: "Tani Sejahtera", region: "Desa Suka Makmur" },
    { id: "PET-003", name: "Asep Sunandar", nik: "320103...", group: "Tani Harapan", region: "Desa Cibinong" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Data Petani</h1>
          <p className="text-muted-foreground">Kelola direktori profil petani terdaftar.</p>
        </div>
        <Button className="w-full sm:w-auto font-semibold">
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Petani
        </Button>
      </div>

      <Card className="shadow-sm border-primary/20">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama atau NIK petani..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>ID Petani</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Dugaan NIK</TableHead>
                <TableHead>Kelompok Tani</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockFarmers.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-primary">{f.id}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.nik}</TableCell>
                  <TableCell>{f.group}</TableCell>
                  <TableCell>{f.region}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
