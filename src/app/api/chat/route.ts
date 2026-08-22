import { groq } from '@ai-sdk/groq';
import { GROQ_CHAT_MODEL } from '@/lib/groqModels';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from 'ai';
import { adminDb } from '@/lib/firebaseAdmin';
import { performRAGSearch } from '@/lib/ragSearch';
import { isAuthFailure, requireUser } from '@/lib/apiAuth';
import { DEFAULT_BRANCH, DEFAULT_SEMESTER } from '@/lib/workspace';
import { z } from 'zod';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const messagePartSchema = z.object({
  text: z.string().optional(),
}).passthrough();

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']).optional(),
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
  if (typeof m.content === 'string' && m.content.trim()) return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts.map((p) => p.text || '').join('\n').trim();
  }
  return '';
}

function normalizePrompt(p: string) {
  return p
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCacheKey(parts: {
  uid: string;
  prompt: string;
  branch: string;
  semester: number;
  resourceId?: string;
}) {
  return [
    parts.uid,
    parts.prompt,
    parts.branch,
    String(parts.semester),
    parts.resourceId || "all",
  ].join("::");
}

function cachedTextStreamResponse(text: string) {
  const id = `cache-${Date.now()}`;
  const stream = createUIMessageStream({
    execute({ writer }) {
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

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const parseResult = chatSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid request payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { messages, context } = parseResult.data;

  const lastMessage = messageText(messages[messages.length - 1]);
  const branch = context?.branch || DEFAULT_BRANCH;
  const semester = context?.semester || DEFAULT_SEMESTER;
  const subjects = context?.subjects || [];
  const resourceId = context?.resourceId;

  const normalizedPrompt = normalizePrompt(lastMessage);
  const cacheKey = buildCacheKey({
    uid: auth.uid,
    prompt: normalizedPrompt,
    branch,
    semester,
    resourceId,
  });

  // Semantic Caching Interceptor — scoped + TTL
  if (normalizedPrompt.length > 5) {
    try {
      const db = adminDb();
      const cachedSnapshot = await db
        .collection('semantic_cache')
        .where('cache_key', '==', cacheKey)
        .limit(1)
        .get();

      if (!cachedSnapshot.empty) {
        const cached = cachedSnapshot.docs[0].data();
        const createdAt = cached.created_at
          ? new Date(cached.created_at).getTime()
          : 0;
        const fresh =
          Number.isFinite(createdAt) &&
          Date.now() - createdAt < CACHE_TTL_MS;
        if (fresh && cached.response && typeof cached.response === 'string') {
          return cachedTextStreamResponse(cached.response);
        }
      }
    } catch (err) {
      console.warn('Semantic cache check error:', err);
    }
  }

  let snippets: string[] = [];

  const cleanQuery = lastMessage
    .toLowerCase()
    .replace(/^(what are|what is|tell me about|explain|do you have|can you|show me|tell me)\s+/i, '')
    .replace(/\s+(from|in|about)\s+(my|the)\s+(slides|notes|ppt|resources|material|coursework|studies)$/i, '')
    .replace(/^(context of|information on|details about)\s+/i, '')
    .trim();

  if (cleanQuery.length > 2) {
    const finalResults = await performRAGSearch(cleanQuery, 5, resourceId);
    snippets = finalResults.map((r) => `[SOURCE: ${r.title} | SUBJECT: ${r.subject_name}]: ${r.snippet}`);
  }

  const subjectList = subjects.length > 0
    ? subjects.join(', ')
    : 'relevant academic subjects';

  const finalMessages = messages.map((m) => ({
    role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: messageText(m),
  })).filter((m) => m.content.length > 0);

  const systemPrompt = `You are the Academic OS AI, a high-performance tutor for university students.
  
STUDENT IDENTITY:
- Program: ${branch} ${branch === 'AIDS' ? '(Artificial Intelligence & Data Science)' : branch === 'ECE' ? '(Electronics & Communication Engineering)' : ''}
- Year/Semester: ${semester}
- Current Subjects: ${subjectList}

INTELLIGENCE RECALL:
- You have a direct link to the student's indexed library of PDFs, PPTs, and DOCs.
- If snippets appear below, they are REAL data from their specific university files.
- CRITICAL: Never claim you don't have access to documents if snippets are provided. Ground your answer in them.

${snippets.length > 0 
  ? `CONTEXT FROM STUDENT RESOURCES:\n${snippets.join('\n\n')}` 
  : 'Note: No direct matches found in local documents for this specific query. Provide a general academic explanation but advise the student to check their slides for specific university-mandated definitions.'}

MODERN TUTOR GUIDELINES:
1. Formatting: Use H3 (###) for sections. Use **bold** for key terms. Use bullet points.
2. Tone: Professional, encouraging, and technically precise.
3. Code: Use fenced code blocks for algorithms or examples.
4. Accuracy: If snippets are present, prioritize them over your general knowledge. Mention resource titles if helpful.`;

  const result = streamText({
    model: groq(GROQ_CHAT_MODEL),
    system: systemPrompt,
    messages: finalMessages,
    maxOutputTokens: 2048,
    onFinish: async ({ text }) => {
      if (normalizedPrompt.length > 5) {
        try {
          const db = adminDb();
          await db.collection('semantic_cache').add({
            cache_key: cacheKey,
            uid: auth.uid,
            prompt: normalizedPrompt,
            branch,
            semester,
            resource_id: resourceId || null,
            response: text,
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Semantic cache insert error:', err);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
