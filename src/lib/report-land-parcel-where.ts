// Filter legalitas Laporan Lahan → `where` Prisma (#305), dipisah dari server action
// supaya pasangannya dengan teks `describeLegalFilters` bisa dikunci test (#319).
// Hanya untuk server & test — `report-land-parcel.ts` ikut ke bundle klien.

import type { Prisma, LandDocumentType, LandStdbStage, LandNktStatus } from "@prisma/client";
import { LAND_DOCUMENT_TYPES } from "@/lib/land-parcel-detail-import";
import { LAND_STDB_STAGES, LAND_NKT_STATUSES, nktAffectedStatusWhere } from "@/lib/land-parcel-satellite-format";
import type { LandParcelLegalFilters, LandParcelReportFilters } from "@/types/report";

/**
 * Validasi bentuk filter dari klien (#319): `coverage` wajib `all`/`mapped` — tanpa
 * itu laporan TIDAK dijalankan, bukan jatuh ke default yang bisa berbeda dengan
 * yang dicetak. Sisa filter tetap disaring per nilai di `landParcelLegalWhere`.
 */
export function parseLandParcelReportFilters(input: unknown): LandParcelReportFilters | null {
  if (!input || typeof input !== "object") return null;
  const coverage = (input as { coverage?: unknown }).coverage;
  if (coverage !== "all" && coverage !== "mapped") return null;
  return input as LandParcelReportFilters;
}

/**
 * Filter legalitas → fragment `where` Prisma (#305). Semuanya lewat relasi
 * `identity` supaya jumlah baris, baris Total, dan kartu ringkasan berasal dari
 * satu kueri yang sama; memfilter array hasil di klien membuat ketiganya beda.
 *
 * Yang TIDAK di sini: `areaDiff` — nilainya turunan (Σ luas tertera vs poligon)
 * sehingga tak bisa jadi `where`; ia difilter di `buildLandParcelReport`, yang
 * juga berjalan di server dan menghitung ringkasannya sekalian.
 */
export function landParcelLegalWhere(filters: LandParcelLegalFilters): Prisma.LandParcelWhereInput[] {
  const out: Prisma.LandParcelWhereInput[] = [];

  // `coverage` WAJIB (#319): tanpa default di sini maupun di `describeLegalFilters`,
  // sehingga `where` dan teks header PDF/Excel tak bisa menyimpang diam-diam
  // (invarian #305). Dulu default fungsi `mapped` sementara default halaman `all`
  // (#318) — pemanggil yang lupa mengirimnya menyaring lahan tanpa terlihat.
  if (filters.coverage === "mapped") {
    out.push({ identity: { externalIds: { some: { isActive: true } } } });
  }

  if (filters.documentStatus === "with") {
    out.push({ identity: { documents: { some: { isActive: true } } } });
  } else if (filters.documentStatus === "without") {
    // "Tanpa surat" = TIDAK ADA baris dokumen aktif sama sekali. Baris `OTHER`
    // + `custodyNote` ("surat di bank", "lahan sudah dijual") tetap dihitung
    // PUNYA surat — skema sengaja memisahkan status penguasaan ke custodyNote.
    out.push({ identity: { documents: { none: { isActive: true } } } });
  }

  // Nilai enum DISARING terhadap daftar sah, bukan di-cast mentah: `filters`
  // datang dari klien, dan `as LandDocumentType[]` akan meneruskan nilai
  // sembarang ke Prisma sehingga pengguna hanya melihat "Gagal memuat laporan"
  // untuk sesuatu yang seharusnya cukup diabaikan.
  const docTypes = (filters.documentTypes ?? []).filter((t): t is LandDocumentType =>
    (LAND_DOCUMENT_TYPES as readonly string[]).includes(t),
  );
  if (docTypes.length > 0) {
    // "Jenis = SHM" berarti punya MINIMAL SATU dokumen SHM; lahan ber-SHM dan
    // ber-SKT muncul di kedua filter — disengaja.
    out.push({ identity: { documents: { some: { isActive: true, type: { in: docTypes } } } } });
  }

  const stdb = filters.stdbStatus;
  if (stdb === "with") {
    out.push({ identity: { stdbLinks: { some: { isActive: true, stdb: { isActive: true } } } } });
  } else if (stdb === "without") {
    out.push({ identity: { stdbLinks: { none: { isActive: true, stdb: { isActive: true } } } } });
  } else if (stdb && (LAND_STDB_STAGES as readonly string[]).includes(stdb)) {
    out.push({
      identity: {
        stdbLinks: { some: { isActive: true, stdb: { isActive: true, stage: stdb as LandStdbStage } } },
      },
    });
  }

  // NKT (#328) — nilai disaring terhadap daftar sah (pola documentTypes).
  const nkt = filters.nktStatus;
  if (nkt === "affected") {
    out.push({ identity: { nkt: { is: nktAffectedStatusWhere() } } });
  } else if (nkt === "assessed") {
    out.push({ identity: { nkt: { isNot: null } } });
  } else if (nkt === "unassessed") {
    out.push({ identity: { nkt: null } });
  } else if (nkt && (LAND_NKT_STATUSES as readonly string[]).includes(nkt)) {
    out.push({ identity: { nkt: { is: { status: nkt as LandNktStatus } } } });
  }

  // Patok (#331) — tautan aktif lahan; `installed` = tak ada patok selain PRESENT (dan ada patok).
  const marker = filters.marker;
  if (marker === "with") {
    out.push({ identity: { markers: { some: { isActive: true } } } });
  } else if (marker === "without") {
    out.push({ identity: { markers: { none: { isActive: true } } } });
  } else if (marker === "installed") {
    out.push({ identity: { markers: { some: { isActive: true }, none: { isActive: true, marker: { condition: { not: "PRESENT" } } } } } });
  } else if (marker === "problem") {
    out.push({ identity: { markers: { some: { isActive: true, marker: { condition: { not: "PRESENT" } } } } } });
  }

  return out;
}
