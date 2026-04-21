import express from "express";
import admin, { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";
import { createNotification } from "../services/notificationService.js";

const router = express.Router();

router.use(authenticate);

router.post("/", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.body.targetUserId);
    const { type, message, metadata } = req.body;

    if (!type || !message) {
      return res.status(400).json({ message: "type and message are required" });
    }

    const notification = await createNotification({ userId: targetUserId, type, message, metadata });
    return res.status(201).json({ message: "Notification created", notification });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create notification", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);
    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", targetUserId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const notifications = snapshot.docs.map((doc) => ({ notificationId: doc.id, ...doc.data() }));
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch notifications", error: error.message });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const ref = db.collection("notifications").doc(notificationId);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const notification = snap.data();
    await resolveTargetUserId(req.user, notification.userId);

    await ref.update({
      status: "read",
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update notification", error: error.message });
  }
});

export default router;
