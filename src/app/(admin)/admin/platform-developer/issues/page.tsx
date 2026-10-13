import { AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { Card, CardContent } from "@/components/ui/card";
import { getGithubIssues } from "@/server/actions/github-issues";
import { IssuesViewClient } from "./issues-view-client";

/**
 * Daftar Issue (#429): semua issue GitHub repo ini, langsung dari GitHub API
 * (cache 30 menit) — beda dengan Rencana Pengembangan yang membaca rencana
 * di `sprint.md`.
 */
export default async function GithubIssuesPage() {
  await requirePermission("platform-developer-issues");

  // Hari ini (WIB) dihitung server per request — pola Rencana Pengembangan.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const result = await getGithubIssues();

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Daftar Issue</h1>
          <HelpHint menuKey="platform-developer-issues" />
        </div>
        <p className="text-muted-foreground">
          Semua issue GitHub repositori aplikasi ini — terbuka maupun sudah ditutup — dibaca langsung dari GitHub dan
          disegarkan paling lama tiap 30 menit. Rencana per rilis ada di menu Rencana Pengembangan.
        </p>
      </div>
      {result.success && result.data ? (
        <IssuesViewClient data={result.data} today={today} />
      ) : (
        <Card className="border-amber-500/40">
          <CardContent className="flex gap-3 pt-6 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <p>{result.success ? "Data issue kosong." : result.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
