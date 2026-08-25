import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const body = await request.json();
    const amount = Number(body.amount);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
    const txnId = typeof body.txnId === "string" ? body.txnId.trim().slice(0, 120) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    }

    const db = adminDb();
    await db.collection("support_messages").add({
      userId: auth.uid,
      name: name || "Anonymous",
      email: email || auth.email || "no-email@shared.com",
      txnId,
      message,
      amount,
      status: "pending_verification",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("support POST", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
