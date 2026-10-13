"use server";

import { unstable_cache } from "next/cache";
import { hasPermission } from "@/lib/rbac";
import { normalizeIssues, type GithubIssue, type GithubIssueRaw } from "@/lib/github-issues";
import type { ActionResult } from "@/types/action-result";

/**
 * Daftar Issue GitHub (#429): semua issue repo (open + closed) langsung dari
 * GitHub REST API — keputusan owner 2026-10-13, bukan berkas md/json yang
 * di-generate. Repo public, jadi tanpa token: batas 60 permintaan/jam per IP
 * server, dan satu penyegaran = ±4 halaman. Hasilnya di-cache 30 menit
 * (`unstable_cache`); bila penyegaran di latar gagal, Next tetap menyajikan
 * data lama, jadi pesan galat hanya muncul bila cache belum pernah terisi.
 *
 * Scope data & soft delete tidak berlaku: bukan data petani, isinya publik.
 */

const MENU_KEY = "platform-developer-issues";
const REPO = "WRI-Indonesia/mis-smallholder-hub";
const PER_PAGE = 100;
/** Pengaman paginasi: 20 halaman = 2.000 issue + PR. */
const MAX_PAGES = 20;
const TIMEOUT_MS = 15_000;
const REVALIDATE_SECONDS = 1800;

export interface GithubIssuesData {
  issues: GithubIssue[];
  /** Waktu data diambil dari GitHub (ISO) — bukan waktu halaman dibuka. */
  fetchedAt: string;
}

/** Galat yang pesannya aman ditampilkan apa adanya ke pengguna. */
class GithubFetchError extends Error {}

const wibTime = (epochSeconds: number) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(
    new Date(epochSeconds * 1000),
  );

async function fetchAllIssues(): Promise<GithubIssuesData> {
  const raw: GithubIssueRaw[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let res: Response;
    try {
      res = await fetch(
        `https://api.github.com/repos/${REPO}/issues?state=all&per_page=${PER_PAGE}&page=${page}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "SmallholderHubMIS/1.0 (+https://github.com/wri-indonesia)",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
    } catch {
      throw new GithubFetchError("GitHub tidak dapat dihubungi. Coba muat ulang halaman beberapa saat lagi.");
    }
    if (!res.ok) {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
        throw new GithubFetchError(
          `Batas permintaan ke GitHub tercapai${reset ? ` — coba lagi sekitar pukul ${wibTime(reset)} WIB` : ""}.`,
        );
      }
      throw new GithubFetchError(`Gagal mengambil daftar issue dari GitHub (HTTP ${res.status}).`);
    }
    const batch = (await res.json()) as GithubIssueRaw[];
    raw.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return { issues: normalizeIssues(raw), fetchedAt: new Date().toISOString() };
}

const cachedIssues = unstable_cache(fetchAllIssues, ["github-issues", REPO], {
  revalidate: REVALIDATE_SECONDS,
});

export async function getGithubIssues(): Promise<ActionResult<GithubIssuesData>> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  try {
    return { success: true, data: await cachedIssues() };
  } catch (e) {
    if (e instanceof GithubFetchError) return { success: false, error: e.message };
    console.error("[github-issues]", e);
    return { success: false, error: "Gagal memproses daftar issue dari GitHub." };
  }
}
