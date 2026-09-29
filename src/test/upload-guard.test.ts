import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & validasi unggah bukti pelatihan (`src/server/actions/upload.ts`)
 * tanpa S3 — pola mock `land-marker-guard.test.ts`. Yang dijaga: izin
 * `master-data-training` EDIT (menempel bukti = update; CREATE saja ditolak, #385), hanya PDF ≤ 10 MB, nama berkas disanitasi di key, dan yang
 * dikembalikan KEY objek (bukan URL publik). #385: `activityId` harus segmen
 * path aman DAN pelatihan aktif dalam scope (helper scope ASLI) sebelum S3.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/s3", () => ({ s3: { send }, S3_BUCKET: "bucket" }));
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));
const findFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { trainingActivity: { findFirst } } }));

const { uploadTrainingEvidence } = await import("@/server/actions/upload");

const form = (file: File | null, activityId: string | null = "ta-1") => {
  const fd = new FormData();
  if (file) fd.set("file", file);
  if (activityId) fd.set("activityId", activityId);
  return fd;
};
const pdf = (name = "Bukti Pelatihan (1).pdf", size = 10) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  send.mockResolvedValue({});
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id }));
});

describe("uploadTrainingEvidence", () => {
  it("#385: CREATE saja (tanpa EDIT) → ditolak; S3 & DB tak disentuh", async () => {
    hasPermission.mockImplementation(async (_m: string, level: string) => level === "CREATE");
    const res = await uploadTrainingEvidence(form(pdf()));
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledWith("master-data-training", "EDIT");
    expect(findFirst).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("EDIT → boleh unggah", async () => {
    hasPermission.mockImplementation(async (_m: string, level: string) => level === "EDIT");
    expect((await uploadTrainingEvidence(form(pdf()))).success).toBe(true);
  });

  it("#385: bukan PDF / terlalu besar → ditolak SEBELUM kueri DB", async () => {
    const png = new File([new Uint8Array(5)], "foto.png", { type: "image/png" });
    await uploadTrainingEvidence(form(png));
    await uploadTrainingEvidence(form(pdf("besar.pdf", 10 * 1024 * 1024 + 1)));
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("#385: nama berkas non-ASCII/kutip → header aman (filename*), nama tampilan ≤ 255", async () => {
    const res = await uploadTrainingEvidence(form(pdf(`Laporan – "GAP" ${"x".repeat(300)}.pdf`)));
    expect(res.success).toBe(true);
    const cmd = send.mock.calls[0][0] as { input: { ContentDisposition: string } };
    expect(cmd.input.ContentDisposition).toMatch(/^inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''[\x21-\x7e]+$/);
    expect(cmd.input.ContentDisposition).not.toContain("–");
    expect(res.success && res.data!.filename.length).toBe(255);
  });

  it("tanpa file / tanpa activityId / bukan PDF / > 10 MB → ditolak tanpa unggah", async () => {
    expect((await uploadTrainingEvidence(form(null))).success).toBe(false);
    expect((await uploadTrainingEvidence(form(pdf(), null))).success).toBe(false);
    const png = new File([new Uint8Array(5)], "foto.png", { type: "image/png" });
    expect(await uploadTrainingEvidence(form(png))).toEqual({ success: false, error: "Hanya file PDF yang diizinkan." });
    expect(await uploadTrainingEvidence(form(pdf("besar.pdf", 10 * 1024 * 1024 + 1)))).toEqual({
      success: false, error: "Ukuran file maksimal 10 MB.",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sukses → mengembalikan KEY di training/<activityId>/ dengan nama tersanitasi", async () => {
    const res = await uploadTrainingEvidence(form(pdf()));
    expect(res.success).toBe(true);
    const key = res.success ? res.data?.key : "";
    expect(key).toMatch(/^training\/ta-1\/\d+-bukti-pelatihan-1-\.pdf$/);
    const cmd = send.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input).toMatchObject({ Bucket: "bucket", Key: key, ContentType: "application/pdf" });
  });

  it("kegagalan S3 → pesan umum, tidak melempar", async () => {
    send.mockRejectedValue(new Error("network"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await uploadTrainingEvidence(form(pdf()))).toEqual({ success: false, error: "Gagal mengupload file. Coba lagi." });
    spy.mockRestore();
  });

  it("#385: activityId dengan / atau .. → ditolak tanpa DB & S3 (tak masuk path)", async () => {
    for (const bad of ["../land-marker", "ta-1/x", "..", "ta 1"]) {
      expect(await uploadTrainingEvidence(form(pdf(), bad))).toEqual({ success: false, error: "Activity ID tidak valid." });
    }
    expect(findFirst).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("#385: pelatihan tidak ada / nonaktif / di luar scope → ditolak sebelum S3; filter scope ASLI", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_DISTRICT", ids: ["1401"] });
    findFirst.mockResolvedValue(null);
    const res = await uploadTrainingEvidence(form(pdf(), "ta-lain"));
    expect(res).toEqual({ success: false, error: "Pelatihan tidak ditemukan atau tidak dalam akses Anda." });
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: "ta-lain", isActive: true, farmerGroup: { districtId: { in: ["1401"] } } });
    expect(send).not.toHaveBeenCalled();
  });
});
