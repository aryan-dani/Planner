import { NextResponse } from "next/server";
import { getFacultySeating, isIshaniConfigured } from "@/lib/ishani";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isIshaniConfigured()) {
      return NextResponse.json(
        { faculty_seating: [], error: "Campus data unavailable" },
        { status: 503 },
      );
    }
    const faculty_seating = await getFacultySeating();
    return NextResponse.json(
      { faculty_seating },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Campus faculty-seating proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
