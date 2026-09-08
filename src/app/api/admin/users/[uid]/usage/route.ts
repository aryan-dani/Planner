import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireAdmin } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ uid: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (isAuthFailure(auth)) return auth;

  const { uid } = await context.params;
  const userId = String(uid || "").trim();
  if (!userId || userId.length > 128) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const db = adminDb();
    let snapshot;
    try {
      snapshot = await db
        .collection("resource_usage")
        .where("user_id", "==", userId)
        .orderBy("count", "desc")
        .limit(15)
        .get();
    } catch {
      snapshot = await db
        .collection("resource_usage")
        .where("user_id", "==", userId)
        .limit(40)
        .get();
    }

    const resources = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: String(d.resource_id || doc.id),
          title: String(d.title || "Untitled"),
          subject: String(d.subject || ""),
          count: Number(d.count) || 0,
          lastOpenedAt: String(d.lastOpenedAt || ""),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return NextResponse.json(
      { resources },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching user resource usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch user usage" },
      { status: 500 },
    );
  }
}
