// Ringkasan rencana rilis (docs/project/sprint.md) sebagai JSON untuk /pagi.
// npx tsx scripts/plan-status.ts [YYYY-MM-DD]   (default: hari ini WIB)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseReleasePlan } from "@/lib/release-plan";
import { planStatus } from "@/lib/plan-status";

const today = process.argv[2] ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plan = parseReleasePlan(readFileSync(join(__dirname, "../docs/project/sprint.md"), "utf-8"));
console.log(JSON.stringify(planStatus(plan, today), null, 2));
