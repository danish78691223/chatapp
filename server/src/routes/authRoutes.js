import express from "express";
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

router.post("/login", loginUser);         // Step 1 — send OTP
router.post("/login-verify", verifyLoginOtp); // Step 2 — verify OTP

router.get("/location", getUserLocation);

export default router;
