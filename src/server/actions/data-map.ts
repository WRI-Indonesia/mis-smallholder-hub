"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { countableFields, dataSchema } from "@/lib/data-schema";
import type { EntityFill, MenuLabel } from "@/types/data-map";

/**
 * Data runtime untuk halaman Peta Data & Skema (DA-07, #256).
 *
 * **Catatan lapis keamanan — dibaca sebelum menambah apa pun di sini.** Dari
 * tiga lapis standar, halaman ini hanya memakai lapis pertama
 * (`hasPermission`). Lapis kedua (access-context per distrik/lembaga) SENGAJA
 * tidak dipakai: yang ditampilkan adalah bentuk dan keterisian *skema* — jumlah
 * baris dan proporsi kolom terisi secara nasional — bukan baris data milik
 * wilayah tertentu, dan menyaring 22 entitas heterogen ke satu scope tidak punya
 * arti yang konsisten. Lapis ketiga (soft delete) tetap dihormati: hitungan
 * memakai baris aktif.
 *
 * **Siapa yang bisa membuka halaman ini: SUPERADMIN & ADMIN.** Yang penting
 * dipahami, itu BUKAN karena baris peran lain tidak ditulis — kaskade izin menu
 * bersifat union tanpa pengurangan (`getUserPermissionsForMenu`), sehingga
 * sub-menu tidak pernah bisa lebih ketat daripada induknya. Yang membuatnya
 * benar-benar terbatas adalah induk `data-analyst` yang hanya ber-VIEW untuk
 * SUPERADMIN. Menambahkan VIEW induk untuk peran lain akan membuka halaman ini
 * tanpa ada baris apa pun yang berubah di sini — dijaga
 * `src/test/menu-access.test.ts` (#262).
 *
 * @lineage-dynamic: R
 * Berkas ini mengakses delegate Prisma secara dinamis (`prisma[clientName]`)
 * untuk MEMBACA seluruh entitas, sesuatu yang tak mungkin dilihat pemindai
 * statis. Penanda di atas membuat halaman ini jujur tentang dirinya sendiri di
 * matriks Jalur data — tanpa itu ia akan tampak hanya menyentuh `menuItem`.
 */

const MENU_KEY = "data-analyst-data-map";

/** Model tanpa kolom `isActive` (tabel penghubung scope akses) — tak bisa difilter. */
const hasIsActive = (entity: { fields: { name: string }[] }) =>
  entity.fields.some((f) => f.name === "isActive");

/**
 * Berapa tabel diagregasi bersamaan. `connection_limit` pool adalah 20
 * (docs/database/performance.md), jadi menembakkan 22 kueri sekaligus bisa
 * menghabiskan pool dan menabrak `pool_timeout` — apalagi kueri ini adalah
 * agregat sekuensial atas tabel terbesar.
 */
const CHUNK = 5;

/**
 * Keterisian kolom per entitas: satu kueri agregat per tabel (~22 kueri), bukan
 * satu kueri per kolom (~300). `_count` per field menghitung baris NON-NULL.
 *
 * Yang dihitung adalah NULL, bukan "kosong": string berisi "" atau "-" tetap
 * dianggap terisi. Untuk kualitas isi (bukan keberadaannya) lihat DA-02/DA-03.
 */
export async function getEntityFillRates(): Promise<EntityFill[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Anda tidak memiliki akses melihat Peta Data & Skema");
  }

  const aggregate = async (entity: (typeof dataSchema.entities)[number]): Promise<EntityFill> => {
    const fields = countableFields(entity);
    const select = Object.fromEntries(fields.map((f) => [f.name, true]));
    const where = hasIsActive(entity) ? { isActive: true } : undefined;

    // Model diakses dinamis lewat nama properti client dari peta skema —
    // sudah disilangkan dengan Prisma.dmmf oleh test, jadi nama pasti ada.
    const delegate = (prisma as unknown as Record<string, { aggregate: (args: unknown) => Promise<unknown> }>)[
      entity.clientName
    ];
    const raw = (await delegate.aggregate({ where, _count: { _all: true, ...select } })) as {
      _count: Record<string, number>;
    };

    const rows = raw._count._all ?? 0;
    return {
      entity: entity.name,
      clientName: entity.clientName,
      domain: entity.domain,
      rows,
      fields: fields.map((f) => ({
        field: f.name,
        isRequired: f.isRequired,
        filled: raw._count[f.name] ?? 0,
        pct: rows === 0 ? null : ((raw._count[f.name] ?? 0) / rows) * 100,
      })),
    };
  };

  const results: EntityFill[] = [];
  for (let i = 0; i < dataSchema.entities.length; i += CHUNK) {
    results.push(...(await Promise.all(dataSchema.entities.slice(i, i + CHUNK).map(aggregate))));
  }

  return results.sort((a, b) => b.rows - a.rows || a.entity.localeCompare(b.entity));
}

/**
 * Judul menu dari DB untuk memberi label matriks jalur data — artefak turunan
 * hanya menyimpan `menuKey` (ia dipindai dari kode, tanpa database).
 */
export async function getMenuLabels(): Promise<MenuLabel[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Anda tidak memiliki akses melihat Peta Data & Skema");
  }

  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    select: { key: true, title: true, parentKey: true, order: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });

  return items.map((item) => ({
    key: item.key,
    title: item.title,
    parentKey: item.parentKey,
    order: item.order,
  }));
}
