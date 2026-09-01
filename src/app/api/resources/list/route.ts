import { NextResponse } from 'next/server';
import { getResourcesFromDB } from '@/lib/dataFetcher';
import { resolveWorkspace } from '@/lib/workspace';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { academicYear, branch, semester } = resolveWorkspace({
      year: searchParams.get('year'),
      branch: searchParams.get('branch'),
      semester: searchParams.get('semester'),
    });

    const resources = await getResourcesFromDB(academicYear, branch, semester);

    return NextResponse.json(
      { resources },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

