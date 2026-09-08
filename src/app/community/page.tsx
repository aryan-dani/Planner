import { adminDb, hasFirebaseCredentials } from "@/lib/firebaseAdmin";
import CommunityClient, { type CommunityDeck, type CommunityFlashcard } from "./CommunityClient";
import { Suspense } from "react";
import { devLog } from "@/lib/devLog";

export const revalidate = 86400;

export default async function CommunityPage() {
  let decks: CommunityDeck[] = [];
  if (hasFirebaseCredentials()) {
    try {
      const db = adminDb();
      const snapshot = await db.collection("community_decks")
        .orderBy("upvotes", "desc")
        .limit(50)
        .get();
        
      decks = snapshot.docs.map(doc => {
        const d = doc.data();
        let createdAtStr = new Date().toISOString();
        if (d.created_at) {
          if (typeof d.created_at.toDate === 'function') {
            createdAtStr = d.created_at.toDate().toISOString();
          } else if (d.created_at.seconds) {
            createdAtStr = new Date(d.created_at.seconds * 1000).toISOString();
          } else {
            createdAtStr = new Date(d.created_at).toISOString();
          }
        }
        const cards = Array.isArray(d.flashcards) ? d.flashcards : [];
        return {
          id: doc.id,
          title: d.title || "",
          branch: d.branch || "",
          semester: Number(d.semester || 0),
          author_name: d.author_name || "",
          author_uid: d.author_uid || "",
          upvotes: Number(d.upvotes || 0),
          cardCount: cards.length,
          flashcards: [] as CommunityFlashcard[],
          created_at: createdAtStr
        };
      });
    } catch (error) {
      console.error("Error fetching community decks from Firestore:", error);
    }
  } else {
    devLog("ℹ️ Skipping community_decks Firestore query during build-time (missing credentials).");
  }

  return (
    <Suspense fallback={<CommunityLoading />}>
      <CommunityClient initialDecks={decks} />
    </Suspense>
  );
}

function CommunityLoading() {
  return (
    <div
      className="flex flex-col justify-center items-center gap-3 py-40 min-h-[80vh] w-full"
      role="status"
      aria-live="polite"
    >
      <span className="loading-orb" aria-hidden />
      <p className="text-xs font-medium text-muted tracking-wide">Loading community…</p>
    </div>
  );
}
