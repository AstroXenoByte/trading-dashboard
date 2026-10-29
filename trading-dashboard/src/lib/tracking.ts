// Authoritative, server-side calculations. Dates are "YYYY-MM-DD" strings (no time zones). Money is integer cents.
export type Status = "TARGET_MET" | "TARGET_NOT_MET" | "TRADING_DAY_SKIPPED" | "DAY_NOT_FINISHED";
export interface Plan { startDate: string; initialTargetCents: number; incrementCents: number; intervalDays: number; periodMonths: number }
export interface CheckIn { date: string; status: Status }
export const DEFAULT_PLAN = { initialTargetCents: 1500, incrementCents: 1000, intervalDays: 7, periodMonths: 8 };

const DAY = 86_400_000;
const parse = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd); };
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fmt(parse(d) + n * DAY);
export const dayDiff = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY);

/** Adds calendar months, clamping to the last valid day (Aug 31 + 6 months = Feb 28/29). */
export function addMonthsClamped(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const t = y * 12 + (m - 1) + n, ny = Math.floor(t / 12), nm = t % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fmt(Date.UTC(ny, nm, Math.min(dd, last)));
}
/** Per spec: end date = start + N calendar months, inclusive. */
export const endDate = (p: Plan) => addMonthsClamped(p.startDate, p.periodMonths);
export const inPeriod = (p: Plan, d: string) => d >= p.startDate && d <= endDate(p);
export const trackingDay = (p: Plan, d: string) => dayDiff(p.startDate, d) + 1;
export const trackingWeek = (p: Plan, d: string) => Math.floor((trackingDay(p, d) - 1) / p.intervalDays);

/** The ONE place the target is computed. Returns null outside the period. */
export function dailyTargetCents(p: Plan, d: string): number | null {
  return inPeriod(p, d) ? p.initialTargetCents + p.incrementCents * trackingWeek(p, d) : null;
}
/** Credit is derived, never client-supplied. Missing check-in => 0. */
export function creditCents(p: Plan, d: string, status?: Status): number {
  return status === "TARGET_MET" ? dailyTargetCents(p, d) ?? 0 : 0;
}

export function datesInRange(p: Plan, from: string, to: string): string[] {
  const s = from > p.startDate ? from : p.startDate, e = to < endDate(p) ? to : endDate(p);
  const out: string[] = [];
  for (let d = s; d <= e; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface Summary {
  opportunityCents: number; earningsCents: number; remainingCents: number;
  met: number; notMet: number; skipped: number; unfinished: number; awaiting: number;
  achievementRate: number | null; earningsPctOfOpportunity: number | null;
}
/** `today` bounds "awaiting": only past/current dates without a check-in count; future dates are neither. */
export function summarize(p: Plan, checkIns: CheckIn[], from: string, to: string, today: string): Summary {
  const byDate = new Map<string, Status>(); // one authoritative check-in per date
  for (const c of checkIns) byDate.set(c.date, c.status);
  const s: Summary = { opportunityCents: 0, earningsCents: 0, remainingCents: 0, met: 0, notMet: 0, skipped: 0, unfinished: 0, awaiting: 0, achievementRate: null, earningsPctOfOpportunity: null };
  for (const d of datesInRange(p, from, to)) {
    s.opportunityCents += dailyTargetCents(p, d)!;
    const st = byDate.get(d);
    s.earningsCents += creditCents(p, d, st);
    if (st === "TARGET_MET") s.met++;
    else if (st === "TARGET_NOT_MET") s.notMet++;
    else if (st === "TRADING_DAY_SKIPPED") s.skipped++;
    else if (st === "DAY_NOT_FINISHED") s.unfinished++;
    else if (d <= today) s.awaiting++;
  }
  s.remainingCents = s.opportunityCents - s.earningsCents;
  const attempts = s.met + s.notMet;
  s.achievementRate = attempts ? (s.met / attempts) * 100 : null;
  s.earningsPctOfOpportunity = s.opportunityCents ? (s.earningsCents / s.opportunityCents) * 100 : null;
  return s;
}

/** Tracking weeks (7-day blocks from start date) and real calendar months. */
export function weeklySummaries(p: Plan, cis: CheckIn[], today: string) {
  const last = trackingWeek(p, endDate(p)), out = [];
  for (let w = 0; w <= last; w++) {
    const from = addDays(p.startDate, w * p.intervalDays);
    const to = addDays(from, p.intervalDays - 1);
    out.push({ week: w + 1, from, to, ...summarize(p, cis, from, to, today) });
  }
  return out;
}
export function monthlySummaries(p: Plan, cis: CheckIn[], today: string) {
  const out = [], e = endDate(p);
  for (let ym = p.startDate.slice(0, 7); ym <= e.slice(0, 7); ym = addMonthsClamped(ym + "-01", 1).slice(0, 7)) {
    const from = ym + "-01", to = addDays(addMonthsClamped(from, 1), -1);
    out.push({ month: ym, ...summarize(p, cis, from, to, today) });
  }
  return out;
}
/** Streaks over completed attempts only; skipped/unfinished/missing don't break or extend. */
export function streaks(cis: CheckIn[]) {
  let cur = 0, best = 0;
  for (const c of [...cis].sort((a, b) => a.date.localeCompare(b.date))) {
    if (c.status === "TARGET_MET") best = Math.max(best, ++cur);
    else if (c.status === "TARGET_NOT_MET") cur = 0;
  }
  return { current: cur, longest: best };
}
