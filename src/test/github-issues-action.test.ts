import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server Action Daftar Issue (#429) tanpa jaringan: guard menu, paginasi GitHub,
 * dan pesan galat yang ramah (rate limit, tak terjangkau, HTTP gagal).
 * `unstable_cache` diganti identitas — cache Next tak tersedia di vitest.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }));

// Modul diimpor ulang per test: jeda-gagal (`lastFailure`) disimpan di level modul.
let getGithubIssues: typeof import("@/server/actions/github-issues").getGithubIssues;

const item = (n: number, extra: Record<string, unknown> = {}) => ({
  number: n,
  title: `Issue ${n}`,
  state: "open",
  created_at: "2026-10-01T00:00:00Z",
  html_url: `https://github.com/x/y/issues/${n}`,
  ...extra,
});

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

const fetchMock = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  ({ getGithubIssues } = await import("@/server/actions/github-issues"));
  hasPermission.mockReset().mockResolvedValue(true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("getGithubIssues", () => {
  it("menolak tanpa izin VIEW menu platform-developer-issues, tanpa memanggil GitHub", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getGithubIssues()).rejects.toThrow();
    expect(hasPermission).toHaveBeenCalledWith("platform-developer-issues", "VIEW");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paginasi sampai halaman < 100 item, PR dibuang", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => item(200 - i));
    const page2 = [item(50), item(49, { pull_request: {} })];
    fetchMock.mockResolvedValueOnce(json(page1)).mockResolvedValueOnce(json(page2));

    const res = await getGithubIssues();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data!.issues).toHaveLength(101);
    expect(res.data!.truncated).toBe(false);
    expect(res.data!.issues.some((i) => i.number === 49)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("state=all&per_page=100&page=1");
    expect(String(fetchMock.mock.calls[1][0])).toContain("page=2");
    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toBeTruthy();
  });

  it("rate limit → pesan dengan jam reset WIB", async () => {
    // 2026-10-13 03:30 UTC = 10:30 WIB.
    const reset = String(Date.UTC(2026, 9, 13, 3, 30) / 1000);
    fetchMock.mockResolvedValueOnce(
      json({ message: "API rate limit exceeded" }, { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset } }),
    );
    const res = await getGithubIssues();
    expect(res).toEqual({ success: false, error: "Batas permintaan ke GitHub tercapai — coba lagi sekitar pukul 10.30 WIB." });
  });

  it("jaringan gagal → pesan tak terjangkau, tidak melempar", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const res = await getGithubIssues();
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/tidak dapat dihubungi/);
  });

  it("setelah gagal, permintaan berikutnya ≤ 60 detik tidak memanggil GitHub lagi (hemat kuota)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await getGithubIssues();
    const again = await getGithubIssues();
    expect(again.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("berhenti di pengaman 20 halaman → truncated", async () => {
    let n = 10_000;
    fetchMock.mockImplementation(async () => json(Array.from({ length: 100 }, () => item(n--))));
    const res = await getGithubIssues();
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(res.success && res.data!.truncated).toBe(true);
  });

  it("HTTP lain → pesan berkode status", async () => {
    fetchMock.mockResolvedValueOnce(json({}, { status: 502 }));
    const res = await getGithubIssues();
    expect(res).toEqual({ success: false, error: "Gagal mengambil daftar issue dari GitHub (HTTP 502)." });
  });
});
