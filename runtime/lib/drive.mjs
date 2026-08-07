import { google } from "googleapis";
import { getEnv, cleanPrivateKey } from "./env.mjs";

let driveInstance = null;

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
