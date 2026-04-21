import express from "express";
import admin, { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";

const router = express.Router();

router.use(authenticate);

router.post("/sync", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.body.targetUserId);
    const { deviceId, status = "online" } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }

    const payload = {
      deviceId,
      userId: targetUserId,
      status,
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("devices").doc(deviceId).set(payload, { merge: true });

    return res.status(200).json({ message: "Device synced", device: payload });
  } catch (error) {
    return res.status(500).json({ message: "Unable to sync device", error: error.message });
  }
});

router.get("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const snap = await db.collection("devices").doc(deviceId).get();

    if (!snap.exists) {
      return res.status(404).json({ message: "Device not found" });
    }

    const device = snap.data();
    await resolveTargetUserId(req.user, device.userId);

    return res.status(200).json({ device: { deviceId: snap.id, ...device } });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch device", error: error.message });
  }
});

export default router;
