import { retrieve } from "@/lib/rag/retrieve";

export interface RAGSearchResult {
  title: string;
  subject_name: string;
  snippet: string;
  file_url?: string;
  branch?: string;
  semester?: number;
  resource_id?: string;
  section_label?: string;
}

/**
 * Backward-compatible shim over hybrid chunk retrieval.
 */
export async function performRAGSearch(
  query: string,
  limit: number = 3,
  resourceId?: string,
  scope?: { academicYear?: string; branch?: string; semester?: number },
): Promise<RAGSearchResult[]> {
  try {
    const result = await retrieve({
      query,
      limit,
      resourceId,
      academicYear: scope?.academicYear,
      branch: scope?.branch,
      semester: scope?.semester,
    });

    return result.sources.map((s) => ({
      resource_id: s.resource_id,
      title: s.title,
      file_url: s.file_url,
      subject_name: s.subject_name,
      branch: s.branch,
      semester: s.semester ?? undefined,
      snippet: s.snippet,
      section_label: s.section_label,
    }));
  } catch (err) {
    console.error("RAG Search Critical Error:", err);
    return [];
  }
}

export { retrieve };
export type { RetrievalResult, RetrievalSource } from "@/lib/rag/types";
