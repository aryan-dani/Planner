import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebaseAdmin";

async function queryAllowedDriveFile(fileId: string): Promise<boolean> {
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

/** Cached allowlist check — avoids Firestore stampede when many users open the same note. */
export function isAllowedDriveFileCached(fileId: string): Promise<boolean> {
  return unstable_cache(
    () => queryAllowedDriveFile(fileId),
    [`drive-allow-${fileId}`],
    { revalidate: 86400, tags: [`drive-file-${fileId}`] },
  )();
}
