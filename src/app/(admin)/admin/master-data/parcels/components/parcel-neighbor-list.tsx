"use client";

import Link from "next/link";
import { NEIGHBOR_DISTANCE_M, neighborOwnerLabel, type ParcelNeighbor } from "@/lib/parcel-neighbor";

/**
 * Legenda lahan tetangga ≤ 25 m (#327) — nomor = urutan array + 1 = nomor di
 * peta & Profil Lahan PDF. Dipakai tab Informasi dan tab Patok (#329) di bawah
 * peta masing-masing. Hanya lahan yang terdaftar di MIS; jalan/sungai/lahan
 * belum dipetakan tak muncul (untuk itu ada Sepadan).
 */
interface Props {
  neighbors: ParcelNeighbor[];
  omitted: number;
  className?: string;
}

export function ParcelNeighborList({ neighbors, omitted, className }: Props) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold">Lahan Tetangga (≤ {NEIGHBOR_DISTANCE_M} m)</h3>
      {neighbors.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada lahan lain yang terdaftar di MIS dalam {NEIGHBOR_DISTANCE_M} m.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium w-8">No</th>
                <th className="py-1.5 pr-3 font-medium">Pemilik</th>
                <th className="py-1.5 pr-3 font-medium">ID Lahan</th>
                <th className="py-1.5 pr-3 font-medium">Lembaga</th>
                <th className="py-1.5 font-medium text-right">Jarak</th>
              </tr>
            </thead>
            <tbody>
              {neighbors.map((n, i) => (
                <tr key={n.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {neighborOwnerLabel(n)}
                    {!n.inScope && <span className="ml-1 text-xs text-muted-foreground" title="Halaman detail lahan ini di luar akses Anda">(di luar akses)</span>}
                  </td>
                  <td className="py-1.5 pr-3 font-mono">
                    {n.inScope ? (
                      <Link href={`/admin/master-data/parcels/${n.id}`} className="text-primary hover:underline">{n.parcelId}</Link>
                    ) : n.parcelId}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{n.groupName}</td>
                  <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                    {n.distanceM === 0
                      ? n.overlaps
                        ? <span className="text-amber-600" title="Interior poligon beririsan — indikasi tumpang tindih">Tumpang tindih ⚠</span>
                        : "Bersinggungan"
                      : `${n.distanceM} m`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {omitted > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">+{omitted} lahan lain dalam {NEIGHBOR_DISTANCE_M} m tidak ditampilkan.</p>
          )}
        </div>
      )}
    </div>
  );
}
