import express from "express";
import axios from "axios";
import admin, { auth, db } from "../config/firebaseAdmin.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, linkedDeviceId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    if (!["caretaker", "elderly"].includes(role)) {
      return res.status(400).json({ message: "Role must be caretaker or elderly" });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });

    const profile = {
      userId: userRecord.uid,
      name,
      email,
      role,
      linkedDeviceId: linkedDeviceId || null,
      linkedUsers: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(userRecord.uid).set(profile);

    return res.status(201).json({
      message: "User created successfully",
      userId: userRecord.uid,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    return res.status(200).json({
      message: "Login successful",
      idToken: response.data.idToken,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn,
      userId: response.data.localId,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Login failed",
      error: error.response?.data?.error?.message || error.message,
    });
  }
});

router.post("/link-user", authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (req.user.role !== "caretaker") {
      return res.status(403).json({ message: "Only caretakers can link users" });
    }

    const targetRef = db.collection("users").doc(targetUserId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      return res.status(404).json({ message: "Target user not found" });
    }

    await db
      .collection("users")
      .doc(req.user.uid)
      .update({
        linkedUsers: admin.firestore.FieldValue.arrayUnion(targetUserId),
      });

    return res.status(200).json({ message: "User linked successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to link user", error: error.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  return res.status(200).json({ user: req.user });
});

export default router;
