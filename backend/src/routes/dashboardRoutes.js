import express from "express";
import { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";

const router = express.Router();

router.use(authenticate);

router.get("/summary", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);

    const [medicineSnap, scheduleSnap, logSnap, notificationSnap] = await Promise.all([
      db.collection("medicines").where("userId", "==", targetUserId).get(),
      db.collection("schedules").where("userId", "==", targetUserId).where("enabled", "==", true).get(),
      db.collection("logs").where("userId", "==", targetUserId).get(),
      db.collection("notifications").where("userId", "==", targetUserId).get(),
    ]);

    const medicines = medicineSnap.docs.map((doc) => ({ medicineId: doc.id, ...doc.data() }));
    const schedules = scheduleSnap.docs.map((doc) => ({ scheduleId: doc.id, ...doc.data() }));
    const logs = logSnap.docs
      .map((doc) => ({ logId: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 30);

    const unreadNotifications = notificationSnap.docs.filter((doc) => doc.data().status === "unread").length;

    const slotStatus = [1, 2, 3, 4].map((slot) => {
      const medicine = medicines.find((m) => m.slotNumber === slot);
      if (!medicine) {
        return { slotNumber: slot, status: "empty", medicineName: null, remainingQuantity: 0 };
      }

      if (medicine.remainingQuantity === 0) {
        return { slotNumber: slot, status: "empty", medicineName: medicine.name, remainingQuantity: 0 };
      }

      if (medicine.remainingQuantity <= medicine.lowThreshold) {
        return {
          slotNumber: slot,
          status: "low",
          medicineName: medicine.name,
          remainingQuantity: medicine.remainingQuantity,
        };
      }

      return {
        slotNumber: slot,
        status: "ok",
        medicineName: medicine.name,
        remainingQuantity: medicine.remainingQuantity,
      };
    });

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextMedicineTime = null;

    schedules.forEach((schedule) => {
      (schedule.times || []).forEach((time) => {
        const [hour, minute] = time.split(":").map(Number);
        const totalMinutes = hour * 60 + minute;
        if (totalMinutes >= currentMinutes) {
          if (!nextMedicineTime || totalMinutes < nextMedicineTime.totalMinutes) {
            nextMedicineTime = { time, scheduleId: schedule.scheduleId, totalMinutes };
          }
        }
      });
    });

    const missedCount = logs.filter((log) => log.status === "missed").length;

    return res.status(200).json({
      summary: {
        nextMedicineTime: nextMedicineTime?.time || null,
        slotStatus,
        medicineCount: medicines.length,
        missedCount,
        unreadNotifications,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch dashboard summary", error: error.message });
  }
});

export default router;
