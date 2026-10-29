import { requireOwner, getPlan, getCheckIns, todayStr, usd } from "@/lib/server";
import { datesInRange, dailyTargetCents, trackingDay, creditCents } from "@/lib/tracking";
import { CheckInForm } from "@/components/CheckInForm";
export const dynamic = "force-dynamic";
const ICON: Record<string, string> = { TARGET_MET: "✓ Target met", TARGET_NOT_MET: "✗ Target not met", TRADING_DAY_SKIPPED: "– Skipped", DAY_NOT_FINISHED: "… Not finished" };
const CLS: Record<string, string> = { TARGET_MET: "ok", TARGET_NOT_MET: "bad", TRADING_DAY_SKIPPED: "mut", DAY_NOT_FINISHED: "warn" };
export default async function History({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireOwner(), p = await getPlan(user.id), f = (await searchParams).status ?? "ALL";
  if (!p) return <p>Set a start date in Settings first.</p>;
  const map = new Map((await getCheckIns(user.id)).map((c) => [c.date, c])), today = todayStr();
  const days = datesInRange(p.plan, p.plan.startDate, today).reverse().filter((d) => f === "ALL" ? true : f === "MISSING" ? !map.has(d) : map.get(d)?.status === f);
  return (<><h1>Check-ins</h1>
    <form style={{ marginBottom: 12 }}><select name="status" defaultValue={f} aria-label="Filter by status"><option value="ALL">All dates</option><option value="MISSING">Awaiting check-in</option>{Object.entries(ICON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> <button>Filter</button></form>
    {days.length === 0 && <p className="mut">Nothing to show for this filter yet.</p>}
    <div className="card wrap"><table><tbody>{days.map((d) => { const c = map.get(d), t = dailyTargetCents(p.plan, d)!; return (
      <tr key={d} id={`d${d}`}><td style={{ width: "100%" }}><details><summary>{d} · target {usd(t)} · <span className={c ? CLS[c.status] : "mut"}>{c ? ICON[c.status] : "Not recorded"}</span> · credit {usd(creditCents(p.plan, d, c?.status))}</summary>
        <div style={{ paddingTop: 10 }}><CheckInForm date={d} day={trackingDay(p.plan, d)} targetCents={t} status={c?.status} note={c?.note} /></div></details></td></tr>); })}</tbody></table></div></>);
}
