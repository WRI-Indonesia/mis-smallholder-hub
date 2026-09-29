/** Repo GitHub proyek — tautan versi (release tag) & issue (Metrik Rilis, Sprint Mingguan). */
const REPO_URL = "https://github.com/WRI-Indonesia/mis-smallholder-hub";
export const releaseUrl = (version: string) => `${REPO_URL}/releases/tag/${version}`;
export const issueUrl = (ref: string) => `${REPO_URL}/issues/${ref.replace("#", "")}`;
/** Berkas docs versi yang sedang berjalan di produksi (`main`), bukan rencana di `mvp`. */
export const docUrl = (path: string) => `${REPO_URL}/blob/main/${path}`;
