import { groq } from "@ai-sdk/groq";
import { GROQ_CHAT_MODEL, GROQ_FAST_MODEL } from "@/lib/groqModels";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import { enforceUserRateLimit } from "@/lib/rateLimit";
import { DEFAULT_BRANCH, DEFAULT_SEMESTER } from "@/lib/workspace";
import { z } from "zod";
import { routeQuery, compactHistory, stripInvalidCitations, validMarkerSet, modelForIntent } from "@/lib/agent/router";
import { executeTool, pickTool, getSyllabusUnit } from "@/lib/agent/tools";
import { searchNotes } from "@/lib/agent/tools";
import { lookupSemanticCache, storeSemanticCache } from "@/lib/rag/cache";
import { CHAT_TEMPERATURE } from "@/lib/rag/config";
import type { RetrievalResult, RetrievalSource } from "@/lib/rag/types";

const messagePartSchema = z.object({
  text: z.string().optional(),
}).passthrough();

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]).optional(),
  content: z.string().max(8000).optional(),
  parts: z.array(messagePartSchema).max(50).optional(),
}).passthrough();

const chatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  context: z.object({
    branch: z.string().max(32).optional(),
    semester: z.number().int().min(1).max(8).optional(),
    subjects: z.array(z.string().max(120)).max(40).optional(),
    resourceId: z.string().max(128).optional(),
  }).optional(),
});

function messageText(m: z.infer<typeof chatMessageSchema>): string {
  if (typeof m.content === "string" && m.content.trim()) return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts.map((p) => p.text || "").join("\n").trim();
  }
  return "";
}

function buildSystemPrompt(params: {
  branch: string;
  semester: number;
  subjects: string[];
  retrieval: RetrievalResult | null;
  syllabusBlock?: string;
  routedIntent: string;
  widened: boolean;
}): string {
  const subjectList = params.subjects.length > 0
    ? params.subjects.join(", ")
    : "relevant academic subjects";

  const contextSection = params.retrieval?.contextBlocks.length
    ? `CONTEXT FROM STUDENT RESOURCES (cite with [S1], [S2], … matching labels below):\n${params.retrieval.contextBlocks.join("\n\n")}`
    : "No direct matches found in the student's indexed library for this query. Clearly label any general-knowledge explanation as NOT from their uploaded materials.";

  const widenedNote = params.widened
    ? "\nNOTE: Search was widened beyond the current semester because no scoped matches were found. Tell the student this."
    : "";

  const syllabusSection = params.syllabusBlock
    ? `\nSYLLABUS REFERENCE:\n${params.syllabusBlock}`
    : "";

  return `You are the Academic OS AI — a grounded tutor for ${params.branch} semester ${params.semester} students.

STUDENT SUBJECTS: ${subjectList}
QUERY TYPE: ${params.routedIntent}

RULES:
1. Every factual claim from the context MUST end with a citation marker like [S1] matching the source labels.
2. Do NOT invent citation markers. Only use markers that appear in the context block.
3. If no context is provided, say "I couldn't find this in your indexed notes" before giving general academic help.
4. Prefer slide/page labels when mentioning sources (e.g. "Slide 14 of DBMS Unit 3").
5. Use ### headings, **bold** key terms, and bullet points.
6. Be concise. No filler.${widenedNote}

${contextSection}${syllabusSection}`;
}

function cachedStreamResponse(text: string, sources?: RetrievalSource[]) {
  const id = `cache-${Date.now()}`;
  const stream = createUIMessageStream({
    execute({ writer }) {
      if (sources?.length) {
        writer.write({
          type: "data-sources",
          data: sources,
        } as never);
      }
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: { "X-Semantic-Cache": "HIT" },
  });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isAuthFailure(auth)) return auth;

  const rate = enforceUserRateLimit(auth.uid, "chat", 30, 60_000);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSec), "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const parseResult = chatSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: "Invalid request payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { messages, context } = parseResult.data;
  const lastMessage = messageText(messages[messages.length - 1]);
  const branch = context?.branch || DEFAULT_BRANCH;
  const semester = context?.semester || DEFAULT_SEMESTER;
  const subjects = context?.subjects || [];
  const resourceId = context?.resourceId;

  const routed = routeQuery(lastMessage);
  const toolCtx = { branch, semester, subjects, resourceId };

  // Semantic cache (embedding-based)
  if (lastMessage.length > 5) {
    try {
      const cached = await lookupSemanticCache({
        uid: auth.uid,
        query: lastMessage,
        branch,
        semester,
        resourceId,
      });
      if (cached?.response) {
        return cachedStreamResponse(
          cached.response,
          cached.sources as RetrievalSource[] | undefined,
        );
      }
    } catch (err) {
      console.warn("Semantic cache check error:", err);
    }
  }

  let retrieval: RetrievalResult | null = null;
  let syllabusBlock = "";
  let resourceListBlock = "";

  if (routed.intent === "syllabus" && routed.subject) {
    const syllabus = getSyllabusUnit(routed.subject, routed.unitNumber);
    if (syllabus) {
      syllabusBlock = syllabus.units
        .map((u) => `- ${u.title}: ${u.desc}`)
        .join("\n");
    }
  }

  const toolName = pickTool(routed.intent);

  if (routed.intent === "compare") {
    const parts = lastMessage.split(/\b(vs\.?|versus|compare|difference between)\b/i);
    const topicA = (parts[0] || lastMessage).trim();
    const topicB = (parts[1] || "").trim();
    const compareResult = await executeTool("compare_topics", { topicA, topicB }, toolCtx);
    if ("a" in compareResult && "b" in compareResult) {
      retrieval = {
        sources: [...compareResult.a.sources, ...compareResult.b.sources].map((s, i) => ({
          ...s,
          marker: `S${i + 1}`,
        })),
        contextBlocks: [
          ...compareResult.a.contextBlocks,
          ...compareResult.b.contextBlocks,
        ],
        contextChars: compareResult.a.contextChars + compareResult.b.contextChars,
        widened: compareResult.a.widened || compareResult.b.widened,
        queryTerms: compareResult.a.queryTerms,
      };
    }
  } else if (routed.intent !== "out_of_scope") {
    const toolResult = await executeTool(
      toolName,
      { query: lastMessage, subject: routed.subject, unitNumber: routed.unitNumber, category: routed.category },
      toolCtx,
    );

    if ("sources" in toolResult && Array.isArray(toolResult.sources)) {
      retrieval = toolResult as RetrievalResult;
    } else if ("resources" in toolResult && Array.isArray(toolResult.resources)) {
      resourceListBlock = toolResult.resources
        .map((r: { title: string; subject_name: string; category: string }) =>
          `- ${r.title} (${r.subject_name}, ${r.category})`)
        .join("\n");
    } else if (!retrieval) {
      retrieval = await searchNotes(lastMessage, toolCtx, routed.category);
    }
  }

  const finalMessages = compactHistory(
    messages.map((m) => ({
      role: m.role || "user",
      content: messageText(m),
    })).filter((m) => m.content.length > 0),
  );

  const systemPrompt = buildSystemPrompt({
    branch,
    semester,
    subjects,
    retrieval,
    syllabusBlock: syllabusBlock + (resourceListBlock ? `\nAVAILABLE FILES:\n${resourceListBlock}` : ""),
    routedIntent: routed.intent,
    widened: retrieval?.widened ?? false,
  });

  const modelId = modelForIntent(routed.intent) === "fast"
    ? GROQ_FAST_MODEL
    : GROQ_CHAT_MODEL;

  const sources = retrieval?.sources ?? [];
  const markers = validMarkerSet(sources);

  const result = streamText({
    model: groq(modelId),
    system: systemPrompt,
    messages: finalMessages,
    maxOutputTokens: 2048,
    temperature: CHAT_TEMPERATURE,
    onFinish: async ({ text }) => {
      const cleaned = stripInvalidCitations(text, markers);
      if (lastMessage.length > 5) {
        await storeSemanticCache({
          uid: auth.uid,
          query: lastMessage,
          branch,
          semester,
          resourceId,
          response: cleaned,
          sources,
        });
      }
    },
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (sources.length > 0) {
        writer.write({ type: "data-sources", data: sources } as never);
      }
      if (retrieval?.widened) {
        writer.write({
          type: "data-scope",
          data: { branch, semester, widened: true },
        } as never);
      }
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
