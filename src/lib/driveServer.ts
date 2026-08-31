import { google } from "googleapis";
import { adminDb } from "@/lib/firebaseAdmin";

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

export function getDriveClient() {
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

export async function isAllowedDriveFile(fileId: string): Promise<boolean> {
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

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeForExtension(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] || "application/octet-stream";
}
