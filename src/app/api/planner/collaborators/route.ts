import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const emailSchema = z.string().email().max(200);
const roleSchema = z.enum(["viewer", "editor"]);

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const body = await request.json();
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleRaw = typeof body.role === "string" ? body.role.trim().toLowerCase() : "";

    if (!planId || planId.length > 128) {
      return NextResponse.json({ error: "Valid planId required" }, { status: 400 });
    }
    const emailParsed = emailSchema.safeParse(emailRaw);
    const roleParsed = roleSchema.safeParse(roleRaw);
    if (!emailParsed.success || !roleParsed.success) {
      return NextResponse.json(
        { error: "Valid email and role (viewer|editor) required" },
        { status: 400 },
      );
    }
    const email = emailParsed.data;
    const role = roleParsed.data;

    const db = adminDb();

    const planSnap = await db.collection("planner_plans").doc(planId).get();
    if (!planSnap.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (planSnap.data()?.owner_id !== auth.uid) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this plan" },
        { status: 403 },
      );
    }

    const existingSnap = await db
      .collection("planner_collaborators")
      .where("plan_id", "==", planId)
      .where("user_email", "==", email)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: "Collaborator already invited" },
        { status: 400 },
      );
    }

    const newCollabRef = db.collection("planner_collaborators").doc();
    const newCollab = {
      plan_id: planId,
      user_email: email,
      role,
      owner_id: auth.uid,
    };
    await newCollabRef.set(newCollab);

    return NextResponse.json({
      success: true,
      collaborator: { id: newCollabRef.id, ...newCollab },
    });
  } catch (error: unknown) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Collaborator ID is required" },
        { status: 400 },
      );
    }

    const db = adminDb();
    const collabSnap = await db.collection("planner_collaborators").doc(id).get();

    if (!collabSnap.exists) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
    }

    const planId = collabSnap.data()?.plan_id;

    const planSnap = await db.collection("planner_plans").doc(planId).get();
    if (!planSnap.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (planSnap.data()?.owner_id !== auth.uid) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this plan" },
        { status: 403 },
      );
    }

    await db.collection("planner_collaborators").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting collaborator:", error);
    return NextResponse.json({ error: "Failed to delete collaborator" }, { status: 500 });
  }
}
