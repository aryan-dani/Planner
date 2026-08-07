import { NextResponse } from "next/server";
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

    const auth = await requireUser(request);
    if (isAuthFailure(auth)) return auth;

    const userEmailPrefix = auth.email?.split("@")[0];

    if (!userEmailPrefix) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 401 },
      );
    }

    const db = adminDb();

    // Fetch the deck to check the author
    const deckDoc = await db.collection("community_decks").doc(id).get();

    if (!deckDoc.exists) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const deck = deckDoc.data();

    // Verify authorship
    if (deck?.author_name !== userEmailPrefix) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own decks" },
        { status: 403 },
      );
    }

    // Perform deletion
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
