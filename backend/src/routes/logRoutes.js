import express from "express";
import admin, { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";
import { createNotification } from "../services/notificationService.js";

const router = express.Router();

router.use(authenticate);

router.post("/update-status", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.body.targetUserId);
    const { medicineId, medicineName, scheduledTime, actualTime, status } = req.body;

    if (!medicineId || !status) {
      return res.status(400).json({ message: "medicineId and status are required" });
    }

    const payload = {
      userId: targetUserId,
      medicineId,
      medicineName: medicineName || "Unknown",
      scheduledTime: scheduledTime || null,
      actualTime: actualTime || new Date().toISOString(),
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("logs").add(payload);

    if (status === "missed") {
      await createNotification({
        userId: targetUserId,
        type: "missed-dose",
        message: `Missed dose detected for ${payload.medicineName}.`,
        metadata: { medicineId, scheduledTime },
      });
    }

    return res.status(201).json({ message: "Log status updated", logId: ref.id });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update log status", error: error.message });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);
    let snapshot;

    try {
      snapshot = await db
        .collection("logs")
        .where("userId", "==", targetUserId)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
    } catch {
      snapshot = await db.collection("logs").where("userId", "==", targetUserId).limit(200).get();
    }

    const logs = snapshot.docs
      .map((doc) => ({ logId: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = new Date(a.actualTime || a.createdAt?.toDate?.() || 0).getTime();
        const bTime = new Date(b.actualTime || b.createdAt?.toDate?.() || 0).getTime();
        return bTime - aTime;
      });

    return res.status(200).json({ logs });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch logs", error: error.message });
  }
});

export default router;
