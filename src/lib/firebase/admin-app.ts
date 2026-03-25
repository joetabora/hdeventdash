import * as admin from "firebase-admin";

function parseServiceAccount(): Record<string, unknown> | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    if (b64) {
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as Record<
        string,
        unknown
      >;
    }
    if (raw) {
      return JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function getFirebaseAdminMessaging(): admin.messaging.Messaging | null {
  const account = parseServiceAccount();
  if (!account) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(
        account as unknown as admin.ServiceAccount
      ),
    });
  }
  return admin.messaging();
}
