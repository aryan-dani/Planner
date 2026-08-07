import admin from "firebase-admin";
import { getEnv, cleanPrivateKey } from "./env.mjs";

function resolveFirebaseConfig() {
  const projectId =
    getEnv("FIREBASE_PROJECT_ID") || getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = cleanPrivateKey(getEnv("FIREBASE_PRIVATE_KEY"));
  const storageBucket = getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  return { projectId, clientEmail, privateKey, storageBucket };
}

const { projectId, clientEmail, privateKey, storageBucket } =
  resolveFirebaseConfig();

if (admin.apps.length === 0) {
  if (projectId && clientEmail && privateKey && !privateKey.includes("YOUR_PRIVATE_KEY_HERE")) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  } else {
    admin.initializeApp({
      projectId: projectId || "placeholder-project-id",
      storageBucket,
    });
  }
}

export const db = admin.firestore();
export const bucket = storageBucket ? admin.storage().bucket() : null;
export { admin };
