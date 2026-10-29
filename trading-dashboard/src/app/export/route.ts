import { requireOwner, getPlan, getCheckIns } from "@/lib/server";
import { dailyTargetCents, creditCents } from "@/lib/tracking";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await requireOwner(), p = await getPlan(user.id);
  const esc = (s: string) => `"${s.replaceAll('"', '""')}"`;
  const rows = ["date,target_usd,status,credit_usd,note"];
  if (p) for (const c of await getCheckIns(user.id)) rows.push([c.date, ((dailyTargetCents(p.plan, c.date) ?? 0) / 100).toFixed(2), c.status, (creditCents(p.plan, c.date, c.status) / 100).toFixed(2), esc(c.note ?? "")].join(","));
  return new Response(rows.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="checkins.csv"' } });
}
