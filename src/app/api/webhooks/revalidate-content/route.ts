import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

async function isAuthorized(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && bearer === cronSecret) return true;
  if (!cronSecret && process.env.NODE_ENV !== "production") return true;
  return false;
}

/** Called by GitHub Actions after Drive sync + indexing to refresh cached pages. */
export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("subjects", "max");
  revalidateTag("resources", "max");
  revalidateTag("syllabus", "max");

  return NextResponse.json({ success: true, revalidated: ["subjects", "resources", "syllabus"] });
}
