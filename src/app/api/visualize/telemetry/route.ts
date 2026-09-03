import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import { getAlgorithm } from "@/lib/visualize/catalog";
import { enforceUserRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "PLAY",
  "PAUSE",
  "RESET",
  "STEP_FORWARD",
  "STEP_BACKWARD",
]);

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (isAuthFailure(user)) return user;

    const rate = await enforceUserRateLimit(user.uid, "visualize-telemetry", 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const body = await request.json();

    const algorithmId =
      typeof body.algorithmId === "string" ? body.algorithmId : "";
    if (!getAlgorithm(algorithmId)) {
      return NextResponse.json({ error: "Unknown algorithm" }, { status: 400 });
    }

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const rawAction = typeof body.action === "string" ? body.action : "";
    const action = ALLOWED_ACTIONS.has(rawAction)
      ? rawAction
      : rawAction.startsWith("JUMP_TO_STEP_")
        ? "JUMP"
        : null;
    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = adminDb();
    await db.collection("visualize_telemetry").add({
      owner_id: user.uid,
      sessionId,
      algorithmId,
      action,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("visualize telemetry POST", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
