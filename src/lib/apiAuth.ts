import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export type AuthedUser = {
  uid: string;
  email: string | null;
};

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
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

async function verifyBearerToken(
  request: Request,
): Promise<AuthedUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}

/** Verify Firebase ID token from Authorization: Bearer <token>. */
export async function requireUser(
  request: Request,
): Promise<AuthedUser | NextResponse> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/** Return the signed-in user when a valid token is present; otherwise null. */
export async function optionalUser(
  request: Request,
): Promise<AuthedUser | null> {
  return verifyBearerToken(request);
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
