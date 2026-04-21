import { auth, db } from "../config/firebaseAdmin.js";

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing authentication token" });
    }

    const decoded = await auth.verifyIdToken(token);
    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ message: "User profile not found" });
    }

    req.user = {
      uid: decoded.uid,
      ...userDoc.data(),
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", error: error.message });
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  next();
};
