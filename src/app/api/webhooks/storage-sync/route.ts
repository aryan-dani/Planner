import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import syncDrive from "../../../../../runtime/tools/sync-drive.mjs";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getAdminEmails } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

async function isAuthorized(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (cronSecret && bearer && bearer === cronSecret) {
    return true;
  }

  if (bearer) {
    try {
      const decoded = await adminAuth().verifyIdToken(bearer);
      const email = decoded.email?.toLowerCase();
      if (email && getAdminEmails().includes(email)) {
        return true;
      }
    } catch {
      // fall through
    }
  }

  // Production: never allow unauthenticated sync (require CRON_SECRET or admin token)
  if (isProduction()) {
    return false;
  }

  // Local/dev only: allow when CRON_SECRET is unset
  if (!cronSecret) {
    return true;
  }

  return false;
}

/** Kick GitHub Actions for full sync+index (pdf parsing is too heavy for Vercel). */
async function triggerGithubSyncWorkflow() {
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (!token) return;

  const res = await fetch(
    "https://api.github.com/repos/aryan-dani/Utility/actions/workflows/storage-sync.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub workflow dispatch failed (${res.status}): ${body}`);
  }
}

async function handleSync(request: Request) {
  try {
    if (!(await isAuthorized(request))) {
      console.warn("⚠️  Webhook unauthorized attempt.");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log(
      "🔔 Storage sync webhook triggered. Queuing Drive→Firestore sync...",
    );

    after(async () => {
      try {
        console.log("🚀 Starting background Drive sync...");
        await syncDrive();
        console.log("✅ Drive sync completed.");
        revalidateTag("subjects", "max");
        revalidateTag("resources", "max");
        revalidateTag("syllabus", "max");

        try {
          await triggerGithubSyncWorkflow();
          console.log("✅ Triggered GitHub Actions for content indexing.");
        } catch (err) {
          console.warn(
            "⚠️  GitHub indexing dispatch skipped/failed (Drive sync already done):",
            err,
          );
        }
      } catch (err) {
        console.error("❌ Background sync failed:", err);
      }
    });

    return NextResponse.json({
      success: true,
      message:
        "Google Drive sync queued. Content indexing runs via GitHub Actions when configured.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Webhook handler failed:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
