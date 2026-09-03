import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import { localDateKey } from "@/lib/dateLocal";

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

    // Prefer date-filtered query; fall back to in-memory filter if index missing.
    let logs: Array<{ logged_date: string; count: number; action_type: string }> = [];
    try {
      const snapshot = await db
        .collection("activity_logs")
        .where("user_id", "==", userId)
        .where("logged_date", ">=", since)
        .limit(2000)
        .get();
      logs = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          logged_date: d.logged_date as string,
          count: d.count as number,
          action_type: d.action_type as string,
        };
      });
    } catch {
      const snapshot = await db
        .collection("activity_logs")
        .where("user_id", "==", userId)
        .limit(2000)
        .get();
      logs = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            logged_date: d.logged_date as string,
            count: d.count as number,
            action_type: d.action_type as string,
          };
        })
        .filter((log) => log.logged_date && log.logged_date >= since);
    }

    return NextResponse.json({ logs });
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

    const userId = auth.uid;
    const body = await request.json();
    const { actionType, count } = body;

    if (typeof actionType !== "string" || !ALLOWED_ACTIONS.has(actionType)) {
      return NextResponse.json(
        { error: "Invalid actionType" },
        { status: 400 },
      );
    }

    if (
      typeof count !== "number" ||
      !Number.isFinite(count) ||
      count < 1 ||
      count > 100
    ) {
      return NextResponse.json(
        { error: "count must be a number between 1 and 100" },
        { status: 400 },
      );
    }

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
