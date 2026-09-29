import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & validasi unggah bukti pelatihan (`src/server/actions/upload.ts`)
 * tanpa S3 — pola mock `land-marker-guard.test.ts`. Yang dijaga: izin
 * `master-data-training` CREATE ATAU EDIT (keduanya ditolak → gagal, S3 tak
 * disentuh), hanya PDF ≤ 10 MB, nama berkas disanitasi di key, dan yang
 * dikembalikan KEY objek (bukan URL publik).
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
});

describe("uploadTrainingEvidence", () => {
  it("CREATE dan EDIT sama-sama ditolak → gagal, S3 tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await uploadTrainingEvidence(form(pdf()));
    expect(res.success).toBe(false);
    expect(hasPermission).toHaveBeenCalledWith("master-data-training", "CREATE");
    expect(hasPermission).toHaveBeenCalledWith("master-data-training", "EDIT");
    expect(send).not.toHaveBeenCalled();
  });

  it("cukup EDIT saja (melengkapi pelatihan yang ada) → boleh unggah", async () => {
    hasPermission.mockImplementation(async (_m: string, level: string) => level === "EDIT");
    expect((await uploadTrainingEvidence(form(pdf()))).success).toBe(true);
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
});
