import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, validToken } from "./auth";
import { Plan, DEFAULT_PLAN, CheckIn, Status } from "./tracking";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? (g.prisma = new PrismaClient());
export const ds = (d: Date) => d.toISOString().slice(0, 10);
export const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "UTC" }).format(new Date());
export const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
/** Verified server-side session -> owner user. Identity never comes from the browser. */
export async function requireOwner() {
  if (!(await validToken((await cookies()).get(COOKIE)?.value))) redirect("/login");
  const email = `${process.env.OWNER_USERNAME ?? "owner"}@owner.local`;
  return db.user.upsert({ where: { email }, update: {}, create: { email, passwordHash: "n/a" } });
}
export async function getPlan(userId: string) {
  const row = await db.trackingPlan.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!row) return null;
  const plan: Plan = { startDate: ds(row.startDate), initialTargetCents: row.initialTargetCents, incrementCents: row.incrementCents, intervalDays: row.intervalDays, periodMonths: DEFAULT_PLAN.periodMonths };
  return { row, plan };
}
export async function getCheckIns(userId: string) {
  const rows = await db.dailyCheckIn.findMany({ where: { userId }, orderBy: { date: "asc" } });
  return rows.map((r) => ({ date: ds(r.date), status: r.status as Status, note: r.note })) as (CheckIn & { note: string | null })[];
}
