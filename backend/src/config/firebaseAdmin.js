import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: dotEnvPath });

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveServiceAccountFromFile = () => {
  const relativePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "../../serviceAccountKey.json";
  const absolutePath = path.resolve(__dirname, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Unable to parse service account file", error.message);
    return null;
  }
};

const envCredential =
  process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey
    ? {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }
    : null;

const fileCredential = resolveServiceAccountFromFile();
const credentialConfig = envCredential || fileCredential;

if (!credentialConfig) {
  throw new Error("Missing Firebase credentials. Configure env vars or FIREBASE_SERVICE_ACCOUNT_PATH.");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentialConfig),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
export default admin;
