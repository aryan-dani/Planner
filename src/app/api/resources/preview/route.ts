import { NextResponse } from "next/server";
import { isAuthFailure, requireUser } from "@/lib/apiAuth";
import {
  getDriveClient,
  isAllowedDriveFile,
  mimeForExtension,
} from "@/lib/driveServer";

const MAX_PREVIEW_BYTES = 32 * 1024 * 1024; // 32 MB

/** Stream a Drive file for in-app preview (PDF, images). Auth required. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthFailure(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const ext = (searchParams.get("ext") || "pdf").toLowerCase();

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
      { responseType: "arraybuffer" },
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    if (buffer.byteLength > MAX_PREVIEW_BYTES) {
      return NextResponse.json(
        { error: "File too large to preview in-app" },
        { status: 413 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeForExtension(ext),
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch file";
    console.error("[resources/preview]", message);
    return NextResponse.json({ error: "Could not load preview" }, { status: 502 });
  }
}
