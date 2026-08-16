import { NextResponse } from "next/server";
import { getHomeCampusData, isIshaniConfigured } from "@/lib/ishani";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isIshaniConfigured()) {
      return NextResponse.json(
        {
          staff: [],
          infrastructure: [],
          error: "Campus data unavailable",
        },
        { status: 503 },
      );
    }
    const data = await getHomeCampusData();
    return NextResponse.json(
      {
        staff: data.staff,
        infrastructure: data.infrastructure,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Campus home-data proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
