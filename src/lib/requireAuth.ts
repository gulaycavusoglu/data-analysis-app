import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function requireAuth(request?: NextRequest) {
  const session = request ? await auth0.getSession(request) : await auth0.getSession();
  if (!session?.user) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, unauthorized: null };
}
