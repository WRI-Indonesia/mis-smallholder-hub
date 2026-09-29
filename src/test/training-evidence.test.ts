import { describe, expect, it } from "vitest";
import { buildTrainingEvidenceKey, isTrainingEvidenceKeyFor, sanitizeEvidenceFileName } from "@/lib/training-evidence";

// #385 — pembentuk & pemeriksa kunci S3 bukti pelatihan harus sepakat.
describe("kunci bukti pelatihan", () => {
  it("kunci buatan server lolos pemeriksa untuk aktivitas yang sama", () => {
    const key = buildTrainingEvidenceKey("cmabc123", "Bukti Pelatihan (1).pdf", 1727600000000);
    expect(key).toBe("training/cmabc123/1727600000000-bukti-pelatihan-1-.pdf");
    expect(isTrainingEvidenceKeyFor(key, "cmabc123")).toBe(true);
  });

  it("nama berisi titik ganda tetap menghasilkan kunci yang lolos (tak ada '..')", () => {
    expect(sanitizeEvidenceFileName("laporan..final...pdf")).toBe("laporan.final.pdf");
    expect(isTrainingEvidenceKeyFor(buildTrainingEvidenceKey("ta1", "a..pdf", 1), "ta1")).toBe(true);
  });

  it.each([
    ["aktivitas lain", "training/ta2/1-a.pdf"],
    ["prefix lain (foto patok)", "land-marker/ta1/1-a.jpg"],
    ["traversal", "training/ta1/../land-marker/x.jpg"],
    ["tanpa timestamp", "training/ta1/a.pdf"],
    ["segmen tambahan", "training/ta1/1-a/b.pdf"],
    ["huruf besar (bukan hasil sanitasi)", "training/ta1/1-A.pdf"],
    ["format lama milik aktivitas lain", "training/evidence/2026/06/ta2/a.pdf"],
    ["nama kosong", "training/ta1/1-"],
  ])("ditolak: %s", (_, key) => {
    expect(isTrainingEvidenceKeyFor(key, "ta1")).toBe(false);
  });

  it("kunci lama (sebelum #385) dengan '..' di NAMA tetap milik aktivitasnya — bukan traversal tanpa '/' (review wrap-up)", () => {
    expect(isTrainingEvidenceKeyFor("training/ta1/1727600000000-notulen..final.pdf", "ta1")).toBe(true);
    expect(isTrainingEvidenceKeyFor("training/evidence/2026/06/ta1/notulen..final.pdf", "ta1")).toBe(true);
  });

  it("activityId tak aman (/, ..) → pembentuk melempar, pemeriksa menolak", () => {
    expect(() => buildTrainingEvidenceKey("../x", "a.pdf", 1)).toThrow();
    expect(() => buildTrainingEvidenceKey("a/b", "a.pdf", 1)).toThrow();
    expect(isTrainingEvidenceKeyFor("training/../1-a.pdf", "..")).toBe(false);
  });
});
