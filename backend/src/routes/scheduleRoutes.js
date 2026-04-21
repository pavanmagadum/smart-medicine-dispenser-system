import express from "express";
import admin, { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";

const router = express.Router();

router.use(authenticate);

router.post("/", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.body.targetUserId);
    const { medicineId, times, frequency = "daily", enabled = true } = req.body;

    if (!medicineId || !Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: "medicineId and times[] are required" });
    }

    const schedule = {
      userId: targetUserId,
      medicineId,
      times,
      frequency,
      enabled,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("schedules").add(schedule);
    return res.status(201).json({ message: "Schedule created", scheduleId: docRef.id, schedule });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create schedule", error: error.message });
  }
});

router.get("/get-schedule", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);
    const snap = await db.collection("schedules").where("userId", "==", targetUserId).where("enabled", "==", true).get();

    const schedules = snap.docs.map((doc) => ({ scheduleId: doc.id, ...doc.data() }));
    return res.status(200).json({ schedules });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch schedules", error: error.message });
  }
});

router.put("/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const scheduleRef = db.collection("schedules").doc(scheduleId);
    const scheduleSnap = await scheduleRef.get();

    if (!scheduleSnap.exists) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const schedule = scheduleSnap.data();
    await resolveTargetUserId(req.user, schedule.userId);

    await scheduleRef.update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Schedule updated" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update schedule", error: error.message });
  }
});

router.delete("/:scheduleId", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const scheduleRef = db.collection("schedules").doc(scheduleId);
    const scheduleSnap = await scheduleRef.get();

    if (!scheduleSnap.exists) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const schedule = scheduleSnap.data();
    await resolveTargetUserId(req.user, schedule.userId);

    await scheduleRef.delete();
    return res.status(200).json({ message: "Schedule deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete schedule", error: error.message });
  }
});

router.get("/next", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const scheduleSnap = await db.collection("schedules").where("userId", "==", targetUserId).where("enabled", "==", true).get();

    let nextSchedule = null;

    scheduleSnap.docs.forEach((doc) => {
      const schedule = { scheduleId: doc.id, ...doc.data() };
      (schedule.times || []).forEach((time) => {
        const [hour, minute] = time.split(":").map(Number);
        const totalMinutes = hour * 60 + minute;

        if (totalMinutes >= currentMinutes) {
          if (!nextSchedule || totalMinutes < nextSchedule.totalMinutes) {
            nextSchedule = {
              ...schedule,
              nextTime: time,
              totalMinutes,
            };
          }
        }
      });
    });

    return res.status(200).json({ nextSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch next schedule", error: error.message });
  }
});

export default router;
