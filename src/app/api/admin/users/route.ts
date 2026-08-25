import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireAdmin } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAuthFailure(auth)) return auth;

  try {
    const db = adminDb();
    const snapshot = await db.collection("users").limit(500).get();
    const users = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid || doc.id,
          email: d.email || "",
          displayName: d.displayName || "",
          provider: d.provider || "",
          branch: d.branch || "",
          semester: d.semester || null,
          lastActive: d.lastActive || d.updatedAt || "",
        };
      })
      .sort((a, b) => {
        const dateA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const dateB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
