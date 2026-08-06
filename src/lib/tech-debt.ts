/**
 * Parser register tech debt (#227 — dialog rincian kartu TD di Metrik Rilis).
 * Sumber tunggal: `docs/project/tech-debt.md` (di-bundle `asset/source`),
 * hanya section "## Debt Register — 🔴 Aktif"; arsip selesai tidak diparse.
 */

export type TechDebtItem = {
  /** "TD-015" */
  id: string;
  /** Status apa adanya dari heading, mis. "🟡 Partial", "🔲 Open". */
  status: string;
  title: string;
  /** "P2"/"P3"; null bila heading tidak mencantumkan. */
  priority: string | null;
};

const HEADING = /^### (TD-\d+) · (\S+ [^—]*?) — (.+)$/;

export function parseActiveTechDebt(markdown: string): TechDebtItem[] {
  const start = markdown.indexOf("## Debt Register");
  if (start === -1) throw new Error("tech-debt.md: section 'Debt Register' tidak ditemukan");
  const rest = markdown.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

  const items: TechDebtItem[] = [];
  for (const line of section.split("\n")) {
    const m = line.trim().match(HEADING);
    if (!m) continue;
    let title = m[3].trim();
    const prio = title.match(/\((P\d)\)\s*$/);
    if (prio) title = title.slice(0, title.lastIndexOf("(")).trim();
    items.push({ id: m[1], status: m[2].trim(), title, priority: prio ? prio[1] : null });
  }
  if (items.length === 0) throw new Error("tech-debt.md: tidak ada item aktif terparse — format heading berubah?");
  return items;
}
