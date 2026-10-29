import "./globals.css";
import Link from "next/link";
import { logout } from "./actions";
import { todayStr } from "@/lib/server";
import { cookies } from "next/headers";
import { COOKIE, validToken } from "@/lib/auth";
export const metadata = { title: "Trading Dashboard" };
export default async function Root({ children }: { children: React.ReactNode }) {
  const authed = await validToken((await cookies()).get(COOKIE)?.value);
  return (<html lang="en"><body>
    {authed && <nav aria-label="Main"><Link href="/">Overview</Link><Link href="/history">Check-ins</Link><Link href="/settings">Settings</Link><Link href="/export">Export CSV</Link>
      <span className="sp" /><span className="mut">{todayStr()}</span><form action={logout}><button>Log out</button></form></nav>}
    <main>{children}</main></body></html>);
}
