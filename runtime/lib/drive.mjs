import { google } from "googleapis";
import { getEnv, cleanPrivateKey } from "./env.mjs";

let driveInstance = null;
let writableDriveInstance = null;

export const DRIVE_SHARED_OPTS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

export function getDrive(scopes = ["https://www.googleapis.com/auth/drive.readonly"]) {
  if (driveInstance) return driveInstance;

  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = cleanPrivateKey(getEnv("FIREBASE_PRIVATE_KEY"));

  if (!clientEmail || !privateKey) {
    throw new Error(
      "❌ Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in environment variables.",
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: scopes,
  });
  driveInstance = google.drive({ version: "v3", auth });
  return driveInstance;
}

/** Writable Drive client — prefers OAuth user quota for copy/upload operations. */
export function getWritableDrive() {
  if (writableDriveInstance) return writableDriveInstance;

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = getEnv("GOOGLE_REFRESH_TOKEN");

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    writableDriveInstance = google.drive({ version: "v3", auth: oauth2Client });
    return writableDriveInstance;
  }

  return getDrive(["https://www.googleapis.com/auth/drive"]);
}
