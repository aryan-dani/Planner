import { adminDb } from "./firebaseAdmin";

export interface RAGSearchResult {
  title: string;
  subject_name: string;
  snippet: string;
  file_url?: string;
  branch?: string;
  semester?: number;
  resource_id?: string;
}

const MAX_CONTENT_DOCS = 80;

function buildSnippet(d: {
  snippet?: string;
  content?: string;
}): string {
  if (d.snippet && typeof d.snippet === "string") return d.snippet;
  if (d.content && typeof d.content === "string") {
    return d.content.substring(0, 1500) + (d.content.length > 1500 ? "..." : "");
  }
  return "";
}

/**
 * Search indexed resource_content via Firestore tokens. Never full-scans `resources`.
 */
export async function performRAGSearch(
  query: string,
  limit: number = 3,
  resourceId?: string,
): Promise<RAGSearchResult[]> {
  try {
    const db = adminDb();
    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (searchTerms.length === 0) return [];

    const stopWords = new Set([
      "the",
      "is",
      "a",
      "and",
      "or",
      "in",
      "of",
      "to",
      "for",
      "with",
      "on",
      "at",
      "by",
      "an",
      "this",
      "that",
      "it",
      "from",
      "as",
      "are",
      "be",
      "was",
      "were",
      "but",
      "not",
      "he",
      "she",
      "they",
      "them",
      "his",
      "her",
      "their",
    ]);
    const cleanTerms = searchTerms.filter((t) => !stopWords.has(t));
    const queryTerms = (cleanTerms.length > 0 ? cleanTerms : searchTerms).slice(
      0,
      10,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentRef: any = db.collection("resource_content");
    if (resourceId) {
      contentRef = contentRef.where("resource_id", "==", resourceId);
    } else if (queryTerms.length > 0) {
      contentRef = contentRef.where(
        "search_tokens",
        "array-contains-any",
        queryTerms,
      );
    } else {
      return [];
    }

    const snapshot = await contentRef.limit(MAX_CONTENT_DOCS).get();

    type Match = RAGSearchResult & { score: number };
    const matches: Match[] = [];

    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data();
      const content = (d.content || "").toLowerCase();
      const title = (d.title || "").toLowerCase();
      const subjectName = (d.subject_name || "").toLowerCase();

      let score = 0;
      searchTerms.forEach((term) => {
        if (title.includes(term)) score += 10;
        if (subjectName.includes(term)) score += 5;
        if (content.includes(term)) score += 2;
      });

      if (resourceId) score += 1;

      if (score > 0) {
        matches.push({
          resource_id: d.resource_id,
          title: d.title || "Untitled",
          snippet: buildSnippet(d),
          subject_name: d.subject_name || "Unknown",
          branch: d.branch,
          semester: d.semester,
          file_url: d.file_url,
          score,
        });
      }
    });

    // Bounded title fallback: only when a specific resourceId was requested
    if (matches.length === 0 && resourceId) {
      const resDoc = await db.collection("resources").doc(resourceId).get();
      if (resDoc.exists) {
        const d = resDoc.data() || {};
        const title = (d.title || "").toLowerCase();
        let score = 0;
        searchTerms.forEach((term) => {
          if (title.includes(term)) score += 1;
        });
        if (score > 0 || searchTerms.length === 0) {
          matches.push({
            resource_id: resDoc.id,
            title: d.title || "Untitled",
            snippet: `Matched by title: ${d.title || "Untitled"}`,
            subject_name: d.subject_name || "Unknown",
            branch: d.branch,
            semester: d.semester,
            file_url: d.file_url,
            score: score || 1,
          });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit).map((r) => ({
      resource_id: r.resource_id,
      title: r.title,
      file_url: r.file_url,
      subject_name: r.subject_name,
      branch: r.branch,
      semester: r.semester,
      snippet: r.snippet,
    }));
  } catch (err) {
    console.error("RAG Search Critical Error:", err);
  }

  return [];
}
