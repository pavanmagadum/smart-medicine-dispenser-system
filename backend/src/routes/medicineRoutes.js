import express from "express";
import admin, { db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";
import { resolveTargetUserId } from "../services/accessControl.js";
import { createNotification } from "../services/notificationService.js";

const router = express.Router();

router.use(authenticate);

router.post("/add-medicine", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.body.targetUserId);
    const { name, slotNumber, totalQuantity, remainingQuantity, lowThreshold, dosageTiming } = req.body;

    if (!name || !slotNumber || totalQuantity == null || lowThreshold == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    if (slotNumber < 1 || slotNumber > 4) {
      return res.status(400).json({ message: "slotNumber must be between 1 and 4" });
    }

    const medicine = {
      userId: targetUserId,
      name,
      slotNumber,
      totalQuantity,
      remainingQuantity: remainingQuantity ?? totalQuantity,
      lowThreshold,
      dosageTiming: dosageTiming || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("medicines").add(medicine);

    return res.status(201).json({ message: "Medicine created", medicineId: docRef.id, medicine });
  } catch (error) {
    return res.status(500).json({ message: "Unable to add medicine", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.user, req.query.targetUserId);
    const snap = await db.collection("medicines").where("userId", "==", targetUserId).get();

    const medicines = snap.docs.map((doc) => ({ medicineId: doc.id, ...doc.data() }));
    return res.status(200).json({ medicines });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch medicines", error: error.message });
  }
});

router.put("/:medicineId", async (req, res) => {
  try {
    const { medicineId } = req.params;
    const medicineRef = db.collection("medicines").doc(medicineId);
    const medicineSnap = await medicineRef.get();

    if (!medicineSnap.exists) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const medicine = medicineSnap.data();
    await resolveTargetUserId(req.user, medicine.userId);

    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await medicineRef.update(updateData);
    return res.status(200).json({ message: "Medicine updated" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update medicine", error: error.message });
  }
});

router.delete("/:medicineId", async (req, res) => {
  try {
    const { medicineId } = req.params;
    const medicineRef = db.collection("medicines").doc(medicineId);
    const medicineSnap = await medicineRef.get();

    if (!medicineSnap.exists) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const medicine = medicineSnap.data();
    await resolveTargetUserId(req.user, medicine.userId);

    await medicineRef.delete();
    return res.status(200).json({ message: "Medicine deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete medicine", error: error.message });
  }
});

router.post("/:medicineId/dispense", async (req, res) => {
  try {
    const { medicineId } = req.params;
    const { status = "taken", actualTime, scheduledTime } = req.body;

    const medicineRef = db.collection("medicines").doc(medicineId);
    const medicineSnap = await medicineRef.get();

    if (!medicineSnap.exists) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const medicine = medicineSnap.data();
    await resolveTargetUserId(req.user, medicine.userId);

    const remainingQuantity = Math.max((medicine.remainingQuantity || 0) - 1, 0);
    await medicineRef.update({
      remainingQuantity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const logPayload = {
      userId: medicine.userId,
      medicineId,
      medicineName: medicine.name,
      scheduledTime: scheduledTime || null,
      actualTime: actualTime || new Date().toISOString(),
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("logs").add(logPayload);

    if (remainingQuantity === 2) {
      await createNotification({
        userId: medicine.userId,
        type: "refill-reminder",
        message: `${medicine.name} has only 2 tablets left. Please refill the tablets.`,
        metadata: { medicineId, remainingQuantity },
      });
    }

    if (remainingQuantity <= medicine.lowThreshold) {
      await createNotification({
        userId: medicine.userId,
        type: remainingQuantity === 0 ? "empty-stock" : "low-stock",
        message:
          remainingQuantity === 0
            ? `${medicine.name} in slot ${medicine.slotNumber} is empty.`
            : `${medicine.name} is low in stock (${remainingQuantity} tablets left).`,
        metadata: { medicineId, remainingQuantity },
      });
    }

    return res.status(200).json({ message: "Dispense status updated", remainingQuantity });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update dispense status", error: error.message });
  }
});

export default router;
