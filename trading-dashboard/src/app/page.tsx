import Link from "next/link";
import { requireOwner, getPlan, getCheckIns, todayStr, usd } from "@/lib/server";
import { summarize, dailyTargetCents, trackingDay, endDate, inPeriod, weeklySummaries, monthlySummaries, streaks, trackingWeek, creditCents } from "@/lib/tracking";
import { CheckInForm } from "@/components/CheckInForm";
export const dynamic = "force-dynamic";
const pct = (n: number | null) => (n === null ? "N/A" : n.toFixed(1) + "%");
const Card = ({ l, v, s }: { l: string; v: string; s?: string }) => (<div className="card"><div className="lbl">{l}</div><div className="val">{v}</div>{s && <div className="sub">{s}</div>}</div>);
export default async function Home() {
  const user = await requireOwner(), p = await getPlan(user.id), today = todayStr();
  if (!p) return (<div className="card"><h1>Welcome</h1><p>Set your tracking start date to begin.</p><Link href="/settings">Go to Settings</Link></div>);
  const cis = await getCheckIns(user.id), plan = p.plan, end = endDate(plan);
  const s = summarize(plan, cis, plan.startDate, end, today);
  const mine = cis.find((c) => c.date === today), inside = inPeriod(plan, today);
  const w = inside ? weeklySummaries(plan, cis, today)[trackingWeek(plan, today)] : null;
  const m = inside ? monthlySummaries(plan, cis, today).find((x) => x.month === today.slice(0, 7)) : null;
  const total = trackingDay(plan, end), progress = inside ? Math.min(100, (trackingDay(plan, today) / total) * 100) : today > end ? 100 : 0;
  const recent = [...cis].reverse().slice(0, 8), st = streaks(cis);
  return (<>
    <h1>Overview</h1>
    <div className="grid">
      <Card l="Target-Based Earnings" v={usd(s.earningsCents)} s="Based on your check-ins. Not broker-verified, not an account balance." />
      <Card l="Today's Target" v={inside ? usd(dailyTargetCents(plan, today)!) : "—"} s={mine ? mine.status.replaceAll("_", " ").toLowerCase() : inside ? "awaiting check-in" : "outside tracking period"} />
      <Card l="Today's Credit" v={inside ? (mine ? usd(creditCents(plan, today, mine.status)) : "Pending") : "—"} />
      <Card l="Target Opportunity" v={usd(s.opportunityCents)} s={`Remaining: ${usd(s.remainingCents)}`} />
      <Card l="Achievement Rate" v={pct(s.achievementRate)} s={`${s.met + s.notMet} completed attempts (met ÷ met+not met)`} />
      <Card l="Tracking Progress" v={inside ? `Day ${trackingDay(plan, today)} / ${total}` : "—"} s={`${plan.startDate} → ${end} · ${progress.toFixed(0)}%`} />
    </div>
    <div className="grid">
      <Card l="Targets met" v={String(s.met)} /><Card l="Not met" v={String(s.notMet)} /><Card l="Skipped" v={String(s.skipped)} /><Card l="Unfinished" v={String(s.unfinished)} /><Card l="Awaiting check-in" v={String(s.awaiting)} />
      <Card l="This week" v={w ? usd(w.earningsCents) : "—"} s={w ? `Week ${w.week}` : undefined} /><Card l="This month" v={m ? usd(m.earningsCents) : "—"} /><Card l="Streak" v={`${st.current} (best ${st.longest})`} />
    </div>
    <div className="card" style={{ marginBottom: 16 }}><h1>Today's check-in</h1>
      {inside ? <CheckInForm date={today} day={trackingDay(plan, today)} targetCents={dailyTargetCents(plan, today)!} status={mine?.status} note={mine?.note} /> : <p className="mut">Today is outside your tracking period.</p>}</div>
    <div className="card wrap"><h1>Recent activity</h1>
      {recent.length === 0 ? <p className="mut">No check-ins yet. Complete today's check-in above to get started.</p> :
        <table><thead><tr><th>Date</th><th>Target</th><th>Status</th><th>Credit</th><th>Note</th></tr></thead><tbody>
          {recent.map((c) => (<tr key={c.date}><td><Link href={`/history#d${c.date}`}>{c.date}</Link></td><td>{usd(dailyTargetCents(plan, c.date) ?? 0)}</td><td>{c.status.replaceAll("_", " ")}</td><td>{usd(creditCents(plan, c.date, c.status))}</td><td>{c.note ? "✎" : ""}</td></tr>))}</tbody></table>}</div>
  </>);
}
