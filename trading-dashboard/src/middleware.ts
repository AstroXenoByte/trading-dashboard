import { NextRequest, NextResponse } from "next/server";
import { COOKIE, validToken } from "@/lib/auth";
export async function middleware(req: NextRequest) {
  if (await validToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!login|_next|favicon.ico).*)"] };
