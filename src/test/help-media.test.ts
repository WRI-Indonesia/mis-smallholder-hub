import { describe, it, expect, vi, beforeEach } from "vitest";
import { s3KeyFromSrc, parseBlocks, type MdBlock } from "@/lib/markdown-lite";

// Presign di-mock: test memverifikasi ATURAN resolusi (mana yang diganti, mana
// yang dibiarkan, dan perilaku saat gagal) — bukan SDK S3-nya.
const getPresignedUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/s3", () => ({ getPresignedUrl }));

const { resolveHelpMedia } = await import("@/lib/help-media");

const media = (src: string): MdBlock => ({
  type: "media",
  kind: "image",
  src,
  caption: "contoh",
});

describe("s3KeyFromSrc", () => {
  it("mengambil key dari s3://, mengabaikan sumber lain", () => {
    expect(s3KeyFromSrc("s3://help/foto.png")).toBe("help/foto.png");
    expect(s3KeyFromSrc("  s3://help/sub/video.mp4  ")).toBe("help/sub/video.mp4");
    expect(s3KeyFromSrc("/help/foto.png")).toBeNull();
    expect(s3KeyFromSrc("https://cdn.id/foto.png")).toBeNull();
    expect(s3KeyFromSrc("s3://")).toBeNull();
  });
});

describe("resolveHelpMedia", () => {
  beforeEach(() => {
    getPresignedUrl.mockReset();
  });

  it("hanya sumber s3:// yang di-presign; lainnya dibiarkan apa adanya", async () => {
    getPresignedUrl.mockResolvedValue("https://s3.example.id/signed?sig=abc");
    const out = await resolveHelpMedia([
      media("s3://help/foto.png"),
      media("/help/lokal.png"),
      media("https://youtu.be/abc123XYZ"),
      ...parseBlocks("Paragraf biasa."),
    ]);
    expect(getPresignedUrl).toHaveBeenCalledExactlyOnceWith("help/foto.png");
    expect(out).toHaveLength(4);
    expect((out[0] as { src: string }).src).toBe("https://s3.example.id/signed?sig=abc");
    expect((out[1] as { src: string }).src).toBe("/help/lokal.png");
    expect((out[2] as { src: string }).src).toBe("https://youtu.be/abc123XYZ");
    expect(out[3].type).toBe("paragraph");
  });

  it("presign gagal → blok media dibuang, materi lain tetap tampil", async () => {
    getPresignedUrl.mockRejectedValue(new Error("kredensial tidak ada"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await resolveHelpMedia([
      ...parseBlocks("Langkah pertama."),
      media("s3://help/rusak.png"),
      ...parseBlocks("Langkah kedua."),
    ]);
    expect(out.map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("tanpa blok media → tak memanggil presign", async () => {
    const out = await resolveHelpMedia(parseBlocks("**Istilah** — penjelasan."));
    expect(getPresignedUrl).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
  });
});
