import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (isAuthFailure(auth)) return auth;

  try {
    const body = await request.json();
    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 200) : "Academic Flashcards";
    const branch = typeof body.branch === "string" ? body.branch.trim().slice(0, 16) : "AIDS";
    const semester = Number(body.semester);
    const flashcards = Array.isArray(body.flashcards) ? body.flashcards.slice(0, 200) : [];

    if (!Number.isFinite(semester) || flashcards.length === 0) {
      return NextResponse.json({ error: "Invalid deck payload" }, { status: 400 });
    }

    const authorName =
      typeof body.author_name === "string"
        ? body.author_name.trim().slice(0, 80)
        : auth.email?.split("@")[0] || "Anonymous Scholar";

    const db = adminDb();
    const ref = await db.collection("community_decks").add({
      title,
      branch,
      semester,
      author_name: authorName,
      author_uid: auth.uid,
      flashcards,
      upvotes: 0,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    console.error("community-decks POST", error);
    return NextResponse.json({ error: "Failed to publish deck" }, { status: 500 });
  }
}
