import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deck ID is required" }, { status: 400 });
    }

    const db = adminDb();
    const deckDoc = await db.collection("community_decks").doc(id).get();
    if (!deckDoc.exists) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const d = deckDoc.data() || {};
    const flashcards = Array.isArray(d.flashcards) ? d.flashcards : [];

    return NextResponse.json({
      id: deckDoc.id,
      title: d.title || "",
      branch: d.branch || "",
      semester: Number(d.semester || 0),
      author_name: d.author_name || "",
      author_uid: d.author_uid || "",
      upvotes: Number(d.upvotes || 0),
      cardCount: flashcards.length,
      flashcards,
    });
  } catch (error) {
    console.error("Error fetching deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deck ID is required" }, { status: 400 });
    }

    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    let body: { action?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body.action !== "upvote") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const db = adminDb();
    const deckRef = db.collection("community_decks").doc(id);
    const deckDoc = await deckRef.get();
    if (!deckDoc.exists) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    await deckRef.update({ upvotes: FieldValue.increment(1) });
    const updated = await deckRef.get();
    const upvotes = Number(updated.data()?.upvotes || 0);

    return NextResponse.json({ success: true, upvotes });
  } catch (error) {
    console.error("Error upvoting deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Deck ID is required" },
        { status: 400 },
      );
    }

    const authResult = await requireUser(request);
    if (isAuthFailure(authResult)) return authResult;

    const db = adminDb();

    const deckDoc = await db.collection("community_decks").doc(id).get();

    if (!deckDoc.exists) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const deck = deckDoc.data();
    const authorUid = typeof deck?.author_uid === "string" ? deck.author_uid : "";

    if (!authorUid || authorUid !== authResult.uid) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own decks" },
        { status: 403 },
      );
    }

    await deckDoc.ref.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
