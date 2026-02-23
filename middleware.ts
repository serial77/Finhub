import { NextRequest, NextResponse } from "next/server";

const USER = process.env.DASHBOARD_USER;
const PASS = process.env.DASHBOARD_PASS;

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Finance Dashboard"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  // If creds are not configured, fail closed in production-like environments.
  if (!USER || !PASS) {
    return new NextResponse("Dashboard auth not configured", { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const b64 = auth.split(" ")[1] || "";
    const [u, p] = atob(b64).split(":");
    if (u === USER && p === PASS) return NextResponse.next();
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
