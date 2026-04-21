import admin, { db } from "../config/firebaseAdmin.js";

export const createNotification = async ({ userId, type, message, metadata = {} }) => {
  const payload = {
    userId,
    type,
    message,
    metadata,
    status: "unread",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("notifications").add(payload);
  return { id: ref.id, ...payload };
};
