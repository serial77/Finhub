import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedSessionToken } from "@/lib/auth";

const USER = process.env.DASHBOARD_USER;
const PASS = process.env.DASHBOARD_PASS;
const SECRET = process.env.DASHBOARD_SESSION_SECRET || "change-me";

const STATIC_ACCOUNTS = [{ user: "Kristy", pass: "Emy" }];

function getAccounts() {
  const accounts = [...STATIC_ACCOUNTS];
  if (USER && PASS) accounts.push({ user: USER, pass: PASS });
  return accounts;
}

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export async function middleware(req: NextRequest) {
  const accounts = getAccounts();
  if (!accounts.length) {
    return new NextResponse("Dashboard auth not configured", { status: 503 });
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  const validTokens = await Promise.all(accounts.map((a) => expectedSessionToken(a.user, a.pass, SECRET)));

  if (cookieToken && validTokens.includes(cookieToken)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
