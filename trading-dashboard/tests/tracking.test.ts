import { describe, it, expect } from "vitest";
import { DEFAULT_PLAN, Plan, dailyTargetCents as t, creditCents, addDays, endDate, summarize, weeklySummaries, monthlySummaries, addMonthsClamped, streaks, CheckIn } from "../src/lib/tracking";
const P: Plan = { startDate: "2026-11-01", ...DEFAULT_PLAN };
const at = (n: number) => addDays(P.startDate, n - 1);
describe("targets", () => {
  it.each([[1,1500],[7,1500],[8,2500],[14,2500],[15,3500],[21,3500],[22,4500]])("day %i", (d, c) => expect(t(P, at(d))).toBe(c));
  it("null outside period", () => { expect(t(P, "2026-10-31")).toBeNull(); expect(t(P, "2027-07-02")).toBeNull(); });
  it("month/year boundaries & clamping", () => {
    expect(addMonthsClamped("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonthsClamped("2023-08-31", 6)).toBe("2024-02-29");
    expect(endDate(P)).toBe("2027-07-01");
    expect(t(P, "2027-01-01")).toBe(1500 + 1000 * Math.floor(61 / 7));
  });
});
describe("credits", () => {
  it("only TARGET_MET credits", () => {
    expect(creditCents(P, at(9), "TARGET_MET")).toBe(2500);
    for (const s of ["TARGET_NOT_MET","TRADING_DAY_SKIPPED","DAY_NOT_FINISHED"] as const) expect(creditCents(P, at(9), s)).toBe(0);
    expect(creditCents(P, at(9))).toBe(0);
  });
});
describe("aggregation", () => {
  const today = at(10);
  const base: CheckIn[] = [{date:at(1),status:"TARGET_MET"},{date:at(2),status:"TARGET_NOT_MET"},{date:at(3),status:"TRADING_DAY_SKIPPED"},{date:at(4),status:"DAY_NOT_FINISHED"},{date:at(8),status:"TARGET_MET"}];
  const s = summarize(P, base, at(1), at(10), today);
  it("totals", () => { expect(s.earningsCents).toBe(4000); expect(s.opportunityCents).toBe(7*1500+3*2500); });
  it("missing != failed; denominator excludes skipped/unfinished", () => {
    expect(s.awaiting).toBe(5); expect(s.achievementRate).toBeCloseTo(66.67, 1);
    expect(summarize(P, [], at(1), at(5), today).achievementRate).toBeNull();
  });
  it("future dates are not awaiting", () => expect(summarize(P, [], at(1), at(20), at(5)).awaiting).toBe(5));
  it("duplicate dates count once", () => expect(summarize(P, [...base, {date:at(1),status:"TARGET_MET"}], at(1), at(1), today).met).toBe(1));
  it("edit transitions recompute without residual credit", () => {
    const run = (st: CheckIn["status"]) => summarize(P, [{date:at(9),status:st}], at(1), at(14), today).earningsCents;
    expect(run("TARGET_MET")).toBe(2500);
    for (const x of ["TARGET_NOT_MET","TRADING_DAY_SKIPPED","DAY_NOT_FINISHED"] as const) expect(run(x)).toBe(0);
  });
  it("weeks are 7-day blocks from start; months are calendar", () => {
    const w = weeklySummaries(P, base, today); expect(w[0].from).toBe(P.startDate); expect(w[1].from).toBe(at(8)); expect(w[0].earningsCents).toBe(1500);
    const m = monthlySummaries(P, base, today); expect(m).toHaveLength(9);
    expect(m[0].opportunityCents).toBe(summarize(P, [], "2026-11-01", "2026-11-30", today).opportunityCents);
  });
  it("sum of weeks == sum of months == total", () => {
    const all = summarize(P, base, P.startDate, endDate(P), today).opportunityCents;
    expect(weeklySummaries(P, base, today).reduce((a, x) => a + x.opportunityCents, 0)).toBe(all);
    expect(monthlySummaries(P, base, today).reduce((a, x) => a + x.opportunityCents, 0)).toBe(all);
  });
  it("streaks ignore skipped/unfinished", () => expect(streaks([{date:"2026-11-01",status:"TARGET_MET"},{date:"2026-11-02",status:"TRADING_DAY_SKIPPED"},{date:"2026-11-03",status:"TARGET_MET"}])).toEqual({current:2,longest:2}));
});
