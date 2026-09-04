import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import { localDateKey } from "@/lib/dateLocal";
import { enforceUserRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "ai_prompt",
  "flashcard_generated",
  "community_deck_published",
  "community_deck_upvoted",
  "community_deck_copied",
  "quiz_generated",
  "quiz_submitted",
  "syllabus_module_completed",
  "srs_flashcard_reviewed",
  "focus_timer_completed",
  "planner_task_completed",
  "focus_session",
  "srs_review",
  "planner_task",
  "ask_chat",
  "study_flashcards",
  "study_quiz",
  "resource_open",
  "summary_generated",
]);

const postSchema = z.object({
  actionType: z
    .string()
    .refine((v) => ALLOWED_ACTIONS.has(v), { message: "Invalid actionType" }),
  count: z.number().int().min(1).max(100),
});

function daysAgoLocal(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateKey(d);
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const userId = auth.uid;
    const db = adminDb();
    const since = daysAgoLocal(365);

    const snapshot = await db
      .collection("activity_logs")
      .where("user_id", "==", userId)
      .where("logged_date", ">=", since)
      .limit(400)
      .get();

    const counts: Record<string, number> = {};
    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      const date = d.logged_date as string | undefined;
      const count = Number(d.count) || 0;
      if (!date || count <= 0) continue;
      counts[date] = (counts[date] || 0) + count;
    }

    return NextResponse.json(
      { counts },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const rate = await enforceUserRateLimit(auth.uid, "activity", 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const userId = auth.uid;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid actionType or count" },
        { status: 400 },
      );
    }

    const { actionType, count } = parsed.data;
    const today = localDateKey();
    const docId = `${userId}_${actionType}_${today}`;
    const db = adminDb();
    const logRef = db.collection("activity_logs").doc(docId);

    await logRef.set(
      {
        user_id: userId,
        action_type: actionType,
        count: FieldValue.increment(Math.floor(count)),
        logged_date: today,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 },
    );
  }
}
