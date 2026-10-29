import { saveCheckIn } from "@/app/actions";
import { usd } from "@/lib/server";
const OPTS = [["TARGET_MET", "Target met", true], ["TARGET_NOT_MET", "Target not met", false], ["TRADING_DAY_SKIPPED", "Trading day skipped", false], ["DAY_NOT_FINISHED", "Day not finished", false]] as const;
export function CheckInForm({ date, day, targetCents, status, note }: { date: string; day: number; targetCents: number; status?: string; note?: string | null }) {
  return (<form action={saveCheckIn}>
    <input type="hidden" name="date" value={date} />
    <p className="mut">{date} · Day {day} · Target {usd(targetCents)} {status ? "· saved — you can edit" : ""}</p>
    <fieldset><legend className="sr">Status</legend>
      {OPTS.map(([v, l, credits]) => (<label key={v} className="opt"><input type="radio" name="status" value={v} defaultChecked={status === v} required />{l}<span className="mut" style={{ marginLeft: "auto" }}>credits {credits ? usd(targetCents) : "$0.00"}</span></label>))}
    </fieldset>
    <textarea name="note" defaultValue={note ?? ""} placeholder="Optional note" rows={2} style={{ width: "100%", marginBottom: 8 }} />
    <button>{status ? "Update check-in" : "Save check-in"}</button></form>);
}
