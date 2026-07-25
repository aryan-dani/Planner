import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export type AuthedUser = {
  uid: string;
  email: string | null;
};

export function getAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthFailure(
  result: AuthedUser | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

/** Verify Firebase ID token from Authorization: Bearer <token>. */
export async function requireUser(
  request: Request,
): Promise<AuthedUser | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Require a signed-in user whose email is on the admin allowlist. */
export async function requireAdmin(
  request: Request,
): Promise<AuthedUser | NextResponse> {
  const user = await requireUser(request);
  if (isAuthFailure(user)) return user;

  const email = user.email?.toLowerCase();
  if (!email || !getAdminEmails().includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}
