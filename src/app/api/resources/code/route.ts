import { google } from "googleapis";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — typical notebooks exceed 2 MB

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, "\n");
}

function getDriveClient() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Drive credentials");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

async function isAllowedDriveFile(fileId: string): Promise<boolean> {
  const db = adminDb();
  const prefix = `https://drive.google.com/file/d/${fileId}`;
  const snapshot = await db
    .collection("resources")
    .where("file_url", ">=", prefix)
    .where("file_url", "<=", `${prefix}\uf8ff`)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/** Fetch plain-text source from a Drive file for the code viewer. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthFailure(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Valid file id required" }, { status: 400 });
  }

  if (!(await isAllowedDriveFile(fileId))) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  try {
    const drive = getDriveClient();
    const res = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "text" },
    );

    const content =
      typeof res.data === "string" ? res.data : String(res.data ?? "");

    if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large to preview in-app" },
        { status: 413 },
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch file";
    console.error("[resources/code]", message);
    return NextResponse.json({ error: "Could not load source file" }, { status: 502 });
  }
}
