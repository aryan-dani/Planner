import { NextResponse } from "next/server";
import { Readable } from "stream";
import {
  getDriveClient,
  mimeForExtension,
} from "@/lib/driveServer";
import { isAllowedDriveFileCached } from "@/lib/driveAllowlist";

const MAX_PREVIEW_BYTES = 32 * 1024 * 1024; // 32 MB

/** Stream a catalog Drive file for in-app preview (CDN-cacheable, shared across users). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const ext = (searchParams.get("ext") || "pdf").toLowerCase();

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Valid file id required" }, { status: 400 });
  }

  if (!(await isAllowedDriveFileCached(fileId))) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  try {
    const drive = getDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: "size,mimeType",
      supportsAllDrives: true,
    });

    const size = Number(meta.data.size ?? 0);
    if (size > MAX_PREVIEW_BYTES) {
      return NextResponse.json(
        { error: "File too large to preview in-app" },
        { status: 413 },
      );
    }

    const res = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" },
    );

    const headers: Record<string, string> = {
      "Content-Type": mimeForExtension(ext),
      "Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    };

    if (size > 0) {
      headers["Content-Length"] = String(size);
    }

    const nodeStream = res.data as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch file";
    console.error("[resources/preview]", message);
    return NextResponse.json({ error: "Could not load preview" }, { status: 502 });
  }
}
