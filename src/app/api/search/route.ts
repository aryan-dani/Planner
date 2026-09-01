import { performRAGSearch } from '@/lib/ragSearch';
import { NextResponse } from 'next/server';
import { isAuthFailure, requireUser } from '@/lib/apiAuth';
import { DEFAULT_ACADEMIC_YEAR, DEFAULT_BRANCH, DEFAULT_SEMESTER } from '@/lib/workspace';
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
  const academicYear = searchParams.get('year') || DEFAULT_ACADEMIC_YEAR;
  const branch = searchParams.get('branch') || DEFAULT_BRANCH;
  const semester = Number(searchParams.get('semester') || DEFAULT_SEMESTER);

  try {
    const results = await performRAGSearch(validQuery, 10, undefined, {
      academicYear,
      branch,
      semester,
    });
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
