"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, makeToken, safeEqual } from "@/lib/auth";
import { db, requireOwner, getPlan, todayStr } from "@/lib/server";
import { addMonthsClamped, dailyTargetCents, inPeriod, DEFAULT_PLAN, Status } from "@/lib/tracking";

const attempts = new Map<string, { n: number; t: number }>(); // simple in-memory limiter (per server instance)
export async function login(_: unknown, fd: FormData): Promise<{ error: string } | undefined> {
  const a = attempts.get("owner") ?? { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 8) return { error: "Too many attempts. Try again in 15 minutes." };
  const ok = safeEqual(String(fd.get("u")), process.env.OWNER_USERNAME ?? "") && safeEqual(String(fd.get("p")), process.env.OWNER_PASSWORD ?? "");
  if (!ok || !process.env.AUTH_SECRET) { a.n++; attempts.set("owner", a); return { error: "Invalid username or password." }; }
  attempts.delete("owner");
  (await cookies()).set(COOKIE, await makeToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  redirect("/");
}
export async function logout() { (await cookies()).delete(COOKIE); redirect("/login"); }

const STATUSES = ["TARGET_MET", "TARGET_NOT_MET", "TRADING_DAY_SKIPPED", "DAY_NOT_FINISHED"];
export async function saveCheckIn(fd: FormData) {
  const user = await requireOwner();
  const date = String(fd.get("date")), status = String(fd.get("status")), note = String(fd.get("note") ?? "").slice(0, 1000) || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !STATUSES.includes(status)) throw new Error("Invalid input");
  const p = await getPlan(user.id);
  if (!p || !inPeriod(p.plan, date) || date > todayStr()) throw new Error("Date is outside the tracking period");
  const targetCents = dailyTargetCents(p.plan, date)!; // computed server-side only
  const when = new Date(date + "T00:00:00Z");
  await db.$transaction(async (tx) => {
    const prev = await tx.dailyCheckIn.findUnique({ where: { userId_date: { userId: user.id, date: when } } });
    const row = await tx.dailyCheckIn.upsert({
      where: { userId_date: { userId: user.id, date: when } },
      update: { status: status as Status, note, targetCents, planId: p.row.id },
      create: { userId: user.id, planId: p.row.id, date: when, status: status as Status, note, targetCents },
    });
    if (!prev || prev.status !== status) await tx.checkInAuditEvent.create({ data: { userId: user.id, checkInId: row.id, previousStatus: prev?.status, newStatus: status as Status } });
  });
  revalidatePath("/", "layout");
}
export async function savePlan(fd: FormData) {
  const user = await requireOwner();
  const start = String(fd.get("start"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || isNaN(Date.parse(start))) throw new Error("Invalid date");
  const data = { startDate: new Date(start + "T00:00:00Z"), endDate: new Date(addMonthsClamped(start, DEFAULT_PLAN.periodMonths) + "T00:00:00Z") };
  const cur = await getPlan(user.id);
  if (cur) await db.trackingPlan.update({ where: { id: cur.row.id }, data }); // check-ins are kept, never deleted
  else await db.trackingPlan.create({ data: { userId: user.id, ...data } });
  revalidatePath("/", "layout");
}
