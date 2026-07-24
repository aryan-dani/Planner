import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { spawn } from "child_process";
import path from "path";
import { adminAuth } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function getAdminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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

  // No CRON_SECRET → allow (keeps Vercel Cron working on Hobby)
  if (!cronSecret) {
    return true;
  }

  return false;
}

/** Run a runtime CLI script outside the Next bundle (avoids pdfjs DOMMatrix crash). */
function runNodeScript(scriptRelativePath: string, args: string[] = []) {
  return new Promise<void>((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), scriptRelativePath);
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${scriptRelativePath} exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`,
          ),
        );
      }
    });
  });
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
      "🔔 Storage sync webhook triggered. Queuing sync and index pipeline in background...",
    );

    after(async () => {
      try {
        console.log("🚀 Starting background sync...");
        await runNodeScript("runtime/tools/sync-drive.mjs");
        console.log("🔍 Starting background index...");
        await runNodeScript("runtime/index.mjs", ["index"]);
        console.log("✅ Background sync and index completed successfully.");
        revalidateTag("subjects", "max");
        revalidateTag("resources", "max");
        revalidateTag("syllabus", "max");
      } catch (err) {
        console.error("❌ Background pipeline failed:", err);
      }
    });

    return NextResponse.json({
      success: true,
      message: "Sync and index queued in background.",
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
