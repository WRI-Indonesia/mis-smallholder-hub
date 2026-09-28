/** Repo GitHub proyek — tautan versi (release tag) & issue (Metrik Rilis, Sprint Mingguan). */
export const REPO_URL = "https://github.com/WRI-Indonesia/mis-smallholder-hub";
export const releaseUrl = (version: string) => `${REPO_URL}/releases/tag/${version}`;
export const issueUrl = (ref: string) => `${REPO_URL}/issues/${ref.replace("#", "")}`;
