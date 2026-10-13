/** Repo GitHub proyek — tautan versi (release tag) & issue (Metrik Rilis, Rencana Pengembangan). */
/** `owner/repo` — satu sumber untuk tautan web & GitHub API (Daftar Issue #429). */
export const REPO_SLUG = "WRI-Indonesia/mis-smallholder-hub";
const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const releaseUrl = (version: string) => `${REPO_URL}/releases/tag/${version}`;
export const issueUrl = (ref: string) => `${REPO_URL}/issues/${ref.replace("#", "")}`;
/** Berkas docs versi yang sedang berjalan di produksi (`main`), bukan rencana di `mvp`. */
export const docUrl = (path: string) => `${REPO_URL}/blob/main/${path}`;
