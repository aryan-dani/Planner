import { performRAGSearch } from '@/lib/ragSearch';
import { NextResponse } from 'next/server';
import { isAuthFailure, requireUser } from '@/lib/apiAuth';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(2).max(200),
});

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthFailure(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const parseResult = searchSchema.safeParse({ q: query });

  if (!parseResult.success) {
    return NextResponse.json({ results: [] });
  }

  const validQuery = parseResult.data.q;

  try {
    const results = await performRAGSearch(validQuery, 10);
    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (err) {
    console.error('Search API Error:', err);
    return NextResponse.json(
      { error: 'Failed to search resources' },
      { status: 500 },
    );
  }
}
