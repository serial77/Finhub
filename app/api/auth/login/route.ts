import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const accounts = getAccounts();
    if (!accounts.length) {
      return NextResponse.json({ error: "Dashboard auth not configured" }, { status: 503 });
    }

    const body = await req.json();
    const user = String(body?.user || "");
    const pass = String(body?.pass || "");

    const matched = accounts.find((a) => a.user === user && a.pass === pass);
    if (!matched) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await expectedSessionToken(matched.user, matched.pass, SECRET);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
