// server/src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import axios from "axios";

const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];

// Temporary OTP store
const otpStore = {};

// -------------------------
// GET USER LOCATION (SAFE)
// -------------------------
export const getUserLocation = async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "8.8.8.8"; // fallback

    let state = "Unknown";

    try {
      const loc = await axios.get(`https://ipapi.co/${ip}/json/`);
      state = loc.data?.region || "Unknown";
    } catch (err) {
      console.log("⚠️ IP API error in getUserLocation:", err.response?.status || err.message);
      state = "Unknown";
    }

    return res.json({ state });
  } catch (err) {
    console.log("Location fatal error:", err.message);
    return res.json({ state: "Unknown" });
  }
};

// HELPER: create transporter (local dev ke liye useful)
const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// -------------------------
// SEND OTP FOR REGISTRATION
// -------------------------
export const sendOtp = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      data: { name, email, phone, password },
      expires: Date.now() + 5 * 60 * 1000,
    };

    console.log(`📧 [REGISTER OTP] ${email} -> ${otp}`);

    // Try sending email, but DON'T crash if it fails
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Chat App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `<h2>Your OTP is: <strong>${otp}</strong></h2>`,
      });
    } catch (mailErr) {
      console.log("⚠️ Registration OTP email failed:", mailErr.code || mailErr.message);
    }

    // Always respond success (OTP stored in memory)
    res.json({ success: true, message: "OTP generated and (attempted) to send to Email" });
  } catch (error) {
    console.error("OTP Error:", error);
    res.status(500).json({ message: "Failed to generate OTP" });
  }
};

// -------------------------
// VERIFY OTP FOR REGISTER
// -------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore[email];

    if (!stored)
      return res.status(400).json({ message: "OTP expired or invalid" });

    if (stored.expires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (stored.otp != otp)
      return res.status(400).json({ message: "Incorrect OTP" });

    const hashedPassword = await bcrypt.hash(stored.data.password, 10);

    const user = await User.create({
      name: stored.data.name,
      email: stored.data.email,
      phone: stored.data.phone,
      password: hashedPassword,
    });

    delete otpStore[email];

    res.json({
      success: true,
      message: "Registration successful",
      user,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};

// -------------------------
// STEP 1 — LOGIN: SEND OTP ONLY (SAFE)
// -------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Detect location safely
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "8.8.8.8";

    let userState = "Unknown";
    let isSouth = false;

    try {
      const loc = await axios.get(`https://ipapi.co/${ip}/json/`);
      userState = loc.data?.region || "Unknown";
      isSouth = southStates.includes(userState);
    } catch (err) {
      console.log("⚠️ IP API error in loginUser:", err.response?.status || err.message);
      userState = "Unknown";
      isSouth = false;
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    };

    console.log(`📧 [LOGIN OTP] ${email} -> ${otp} (state: ${userState})`);

    // Try sending email, but DON'T crash app if it fails
    try {
      const transporter = createTransporter();
      const subject = isSouth
        ? "Southern India Login Verification"
        : "Your Login OTP";

      await transporter.sendMail({
        to: email,
        subject,
        html: `<h2>Your OTP:</h2><h3>${otp}</h3>`,
      });
    } catch (mailErr) {
      console.log("⚠️ Login OTP email failed:", mailErr.code || mailErr.message);
    }

    res.json({
      otpSent: true,
      message: "OTP generated and (attempted) to send to your email",
    });
  } catch (error) {
    console.error("Login OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------
// STEP 2 — VERIFY LOGIN OTP
// -------------------------
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore[email];

    if (!stored)
      return res.status(400).json({ message: "OTP expired or not requested" });

    if (stored.expires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (stored.otp != otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findOne({ email });
    delete otpStore[email];

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      success: true,
      message: "Login verified",
      token,
      user,
    });
  } catch (error) {
    console.error("Verify Login OTP Error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};
