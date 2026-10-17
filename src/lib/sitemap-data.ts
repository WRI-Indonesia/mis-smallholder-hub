import overviewMd from "../../docs/product/sitemap/overview.md";
import masterDataMd from "../../docs/product/sitemap/master-data.md";
import bulkUploadMd from "../../docs/product/sitemap/bulk-upload.md";
import dashboardMd from "../../docs/product/sitemap/dashboard.md";
import mapMd from "../../docs/product/sitemap/map.md";
import reportMd from "../../docs/product/sitemap/report.md";
import dataAnalystMd from "../../docs/product/sitemap/data-analyst.md";
import toolsMd from "../../docs/product/sitemap/tools.md";
import settingsMd from "../../docs/product/sitemap/settings.md";
import platformDeveloperMd from "../../docs/product/sitemap/platform-developer.md";
import helpMd from "../../docs/product/sitemap/help.md";
import { SITEMAP_FILES, parseSitemapMarkdown, type SitemapDoc, type SitemapFileKey } from "./sitemap-mermaid";

/**
 * Data Peta Fitur — `docs/product/sitemap/*.md` di-bundle webpack
 * (`asset/source`, pola `release-plan-data.ts`) dan diparse SEKALI saat modul
 * dimuat. Perubahan berkas tampil setelah build ulang.
 *
 * Jangan import dari unit test (vitest tidak memuat `.md`); test membaca
 * berkas lewat `fs` dan memakai parser murninya.
 */
const SOURCES: Record<SitemapFileKey, string> = {
  overview: overviewMd,
  "master-data": masterDataMd,
  "bulk-upload": bulkUploadMd,
  dashboard: dashboardMd,
  map: mapMd,
  report: reportMd,
  "data-analyst": dataAnalystMd,
  tools: toolsMd,
  settings: settingsMd,
  "platform-developer": platformDeveloperMd,
  help: helpMd,
};

export const SITEMAP_DOCS: SitemapDoc[] = SITEMAP_FILES.map((f) => parseSitemapMarkdown(f.key, SOURCES[f.key]));
