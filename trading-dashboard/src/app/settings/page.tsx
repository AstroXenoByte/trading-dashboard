import { requireOwner, getPlan, usd } from "@/lib/server";
import { savePlan } from "../actions";
import { endDate, addDays, dailyTargetCents } from "@/lib/tracking";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const user = await requireOwner(), p = await getPlan(user.id);
  const rows = p ? Array.from({ length: 8 }, (_, i) => { const d = addDays(p.plan.startDate, i * 7); return [i + 1, d, dailyTargetCents(p.plan, d)!] as const; }) : [];
  return (<><h1>Settings</h1>
    <form action={savePlan} className="card" style={{ marginBottom: 16 }}>
      <label>Tracking start date <input type="date" name="start" defaultValue={p?.plan.startDate} required /></label>{" "}<button>{p ? "Update start date" : "Start tracking"}</button>
      {p && <p className="mut">Ends {endDate(p.plan)} (8 calendar months). Changing the start date re-maps which target applies to each date. Check-ins are never deleted, but those outside the new period stop counting in totals.</p>}</form>
    {p && <div className="card"><div className="lbl">Schedule preview (first 8 weeks, USD)</div><table><tbody>{rows.map(([w, d, t]) => <tr key={w}><td>Week {w}</td><td>{d}</td><td>{usd(t)}/day</td></tr>)}</tbody></table><p className="sub">$15 for days 1–7, +$10 every 7 calendar days. Skipped days never pause the schedule.</p></div>}
    <div className="card" style={{ marginTop: 16 }}><div className="lbl">Owner login</div><p className="mut">Username and password live in the OWNER_USERNAME / OWNER_PASSWORD environment variables. Change them there and restart or redeploy.</p></div></>);
}
