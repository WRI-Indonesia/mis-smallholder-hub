"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { programTargetPlanError, type ProgramTargetRecord } from "@/lib/program-target";
import { programTargetSaveSchema, type ProgramTargetCellInput } from "@/validations/program-target.schema";
import type { ActionResult } from "@/types/action-result";

/**
 * Target kontrak / trayektori program (#403). Data berlaku untuk SELURUH program (bukan
 * per Lembaga) — lapis scope akses tidak berlaku (tercatat di docs/product/access-context.md).
 * Dua lapis lain tetap: izin menu & soft delete.
 */
const MENU_KEY = "master-data-program-target";
const PAGE_PATH = "/admin/master-data/program-target";

export interface ProgramTargetView {
  records: ProgramTargetRecord[];
  /** Perubahan terakhir — ditampilkan di halaman isian. */
  lastModified: { at: string; by: string | null } | null;
}

/** Dibaca halaman Target Program DAN tampilan "vs Kontrak" Dashboard Pelatihan. */
export async function getProgramTargets(): Promise<ProgramTargetView> {
  const [canMenu, canDashboard] = await Promise.all([
    hasPermission(MENU_KEY, "VIEW"),
    hasPermission("dashboard-training", "VIEW"),
  ]);
  if (!canMenu && !canDashboard) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  // Dua query independen → paralel (temuan review: 3 round-trip berurutan).
  const [rows, last] = await Promise.all([
    prisma.programTarget.findMany({
      where: { isActive: true },
      select: { indicator: true, periodType: true, year: true, value: true },
      orderBy: [{ indicator: "asc" }, { year: "asc" }],
    }),
    prisma.programTarget.findFirst({
      orderBy: { modifiedAt: "desc" },
      select: { modifiedAt: true, modifiedBy: true, createdBy: true },
    }),
  ]);
  let by: string | null = null;
  const byId = last?.modifiedBy ?? last?.createdBy ?? null;
  if (byId) {
    const user = await prisma.user.findUnique({ where: { id: byId }, select: { name: true } });
    by = user?.name ?? null;
  }
  return {
    records: rows.map((r) => ({ indicator: r.indicator, periodType: r.periodType, year: r.year, value: r.value })),
    lastModified: last ? { at: last.modifiedAt.toISOString(), by } : null,
  };
}

/**
 * Simpan grid Target Program. Sel ber-nilai → upsert (baris nonaktif diaktifkan lagi);
 * sel kosong → soft delete. Mengganti tahun Start menonaktifkan baseline tahun lain.
 */
export async function saveProgramTargets(input: ProgramTargetCellInput[]): Promise<ActionResult<{ saved: number; cleared: number }>> {
  const [canEdit, canCreate, canDelete] = await Promise.all([
    hasPermission(MENU_KEY, "EDIT"),
    hasPermission(MENU_KEY, "CREATE"),
    hasPermission(MENU_KEY, "DELETE"),
  ]);
  if (!canEdit) return { success: false, error: "Tidak memiliki izin untuk mengubah target program" };

  const parsed = programTargetSaveSchema.safeParse(input);
  if (!parsed.success) {
    // Skema berupa array sel → `fieldErrors` tak bermakna; pesan isu pertama sudah spesifik
    // ("Tahun minimal 2015", "Target tidak boleh negatif", …) — temuan review.
    return { success: false, error: parsed.error.issues[0]?.message ?? "Isian target tidak valid" };
  }
  const cells = parsed.data;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const existing = await prisma.programTarget.findMany({
    select: { indicator: true, periodType: true, year: true, value: true, isActive: true },
  });
  const key = (c: { indicator: string; periodType: string; year: number }) => `${c.indicator}|${c.periodType}|${c.year}`;
  const existingKeys = new Map(existing.map((e) => [key(e), e.isActive]));
  const activeValue = new Map(existing.filter((e) => e.isActive).map((e) => [key(e), e.value]));
  if (!canCreate && cells.some((c) => c.value != null && !existingKeys.get(key(c)))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah target baru" };
  }
  if (!canDelete && cells.some((c) => c.value == null && existingKeys.get(key(c)))) {
    return { success: false, error: "Tidak memiliki izin untuk mengosongkan target" };
  }
  const baselineYear = cells.find((c) => c.periodType === "BASELINE" && c.value != null)?.year ?? null;
  // Mengganti tahun Start menonaktifkan baseline tahun lain = menghapus → butuh DELETE.
  // Dulu dilewati diam-diam lalu sukses, sehingga dua tahun Start aktif bercampur (review).
  const staleBaseline = existing.filter((e) => e.isActive && e.periodType === "BASELINE" && baselineYear != null && e.year !== baselineYear);
  if (staleBaseline.length > 0 && !canDelete) {
    return { success: false, error: "Tidak memiliki izin untuk mengganti tahun Start (perlu izin hapus)" };
  }

  // Validasi bentuk rencana atas HASIL AKHIR (baris aktif lama ditimpa isian), bukan isian saja.
  const finalState = new Map<string, ProgramTargetRecord>(
    existing.filter((e) => e.isActive).map((e) => [key(e), { indicator: e.indicator, periodType: e.periodType, year: e.year, value: e.value }]),
  );
  for (const c of cells) {
    if (c.value == null) finalState.delete(key(c));
    else finalState.set(key(c), { indicator: c.indicator, periodType: c.periodType, year: c.year, value: c.value });
  }
  for (const e of staleBaseline) finalState.delete(key(e));
  const planError = programTargetPlanError([...finalState.values()]);
  if (planError) return { success: false, error: planError };

  let saved = 0;
  let cleared = 0;
  await prisma.$transaction(async (tx) => {
    for (const c of cells) {
      const where = { indicator_periodType_year: { indicator: c.indicator, periodType: c.periodType, year: c.year } };
      if (c.value == null) {
        if (existingKeys.get(key(c))) {
          await tx.programTarget.update({ where, data: { isActive: false, modifiedBy: userId } });
          cleared += 1;
        }
        continue;
      }
      // Sel tak berubah tidak ditulis ulang — "Terakhir diubah oleh" tetap akurat (review).
      if (activeValue.get(key(c)) === c.value) continue;
      await tx.programTarget.upsert({
        where,
        create: { indicator: c.indicator, periodType: c.periodType, year: c.year, value: c.value, createdBy: userId },
        update: { value: c.value, isActive: true, modifiedBy: userId },
      });
      saved += 1;
    }
    if (staleBaseline.length > 0) {
      const res = await tx.programTarget.updateMany({
        where: { periodType: "BASELINE", isActive: true, year: { not: baselineYear! } },
        data: { isActive: false, modifiedBy: userId },
      });
      cleared += res.count;
    }
  });

  revalidatePath(PAGE_PATH);
  revalidatePath("/admin/dashboard/training");
  return { success: true, data: { saved, cleared } };
}
