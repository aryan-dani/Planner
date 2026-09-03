import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/driveServer";
import { isAllowedDriveFileCached } from "@/lib/driveAllowlist";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — typical notebooks exceed 2 MB

/** Fetch plain-text source from a Drive file for the code viewer (allowlisted anonymous GET). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Valid file id required" }, { status: 400 });
  }

  if (!(await isAllowedDriveFileCached(fileId))) {
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
