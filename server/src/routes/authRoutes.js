import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  sendOtp,
  verifyOtp,
  loginUser,
  verifyLoginOtp,
  getUserLocation,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/login", loginUser);              // Step 1 — send OTP
router.post("/login-verify", verifyLoginOtp);  // Step 2 — verify OTP

router.get("/location", getUserLocation);

router.get("/e2ee/public-key/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("_id name publicKey e2eeVersion");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.publicKey) return res.status(404).json({ message: "E2EE key not registered" });
    res.json({
      userId: user._id,
      name: user.name,
      publicKey: user.publicKey,
      e2eeVersion: user.e2eeVersion || 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch E2EE public key" });
  }
});

router.put("/e2ee/public-key", protect, async (req, res) => {
  try {
    const { publicKey, e2eeVersion = 1 } = req.body;
    if (!publicKey || typeof publicKey !== "object") {
      return res.status(400).json({ message: "A valid publicKey is required" });
    }

    await User.findByIdAndUpdate(req.userId, {
      publicKey,
      e2eeVersion,
    });

    res.json({ message: "E2EE public key registered", e2eeVersion });
  } catch (error) {
    res.status(500).json({ message: "Unable to register E2EE public key" });
  }
});

export default router;
