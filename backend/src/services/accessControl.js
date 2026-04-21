import { db } from "../config/firebaseAdmin.js";

export const resolveTargetUserId = async (requester, targetUserId) => {
  if (!targetUserId || targetUserId === requester.uid) {
    return requester.uid;
  }

  if (requester.role !== "caretaker") {
    throw new Error("Only caretakers can access another user");
  }

  const linkedUsers = requester.linkedUsers || [];
  if (!linkedUsers.includes(targetUserId)) {
    throw new Error("Target user is not linked to this caretaker");
  }

  const targetUserSnap = await db.collection("users").doc(targetUserId).get();
  if (!targetUserSnap.exists) {
    throw new Error("Target user does not exist");
  }

  return targetUserId;
};
