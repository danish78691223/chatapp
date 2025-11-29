// server/src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import axios from "axios";
import brevo from "../utils/brevoClient.js";

const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];

const otpStore = {}; // in-memory

// -------------------------
// GET LOCATION
// -------------------------
export const getUserLocation = async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "8.8.8.8";

    let state = "Unknown";
    try {
      const loc = await axios.get(`https://ipapi.co/${ip}/json/`);
      state = loc.data?.region || "Unknown";
    } catch (_) {}

    return res.json({ state });
  } catch (err) {
    return res.json({ state: "Unknown" });
  }
};

// -------------------------
// SEND OTP FOR REGISTER
// -------------------------
export const sendOtp = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password || !phone)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      data: { name, email, phone, password },
      expires: Date.now() + 5 * 60 * 1000,
    };

    console.log("📧 REGISTER OTP:", otp, email);

    await brevo.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER },
      to: [{ email }],
      subject: "Your Registration OTP",
      htmlContent: `<h1>Your OTP is ${otp}</h1><p>Valid for 5 mins</p>`
    });

    res.json({ success: true });
  } catch (e) {
    console.log("Send OTP Error:", e.message);
    res.status(500).json({ message: "OTP send failed" });
  }
};

// -------------------------
// VERIFY REGISTER OTP
// -------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore[email];
    if (!stored) return res.status(400).json({ message: "OTP expired" });

    if (stored.expires < Date.now()) return res.status(400).json({ message: "OTP expired" });

    if (stored.otp != otp) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPw = await bcrypt.hash(stored.data.password, 10);

    const user = await User.create({
      name: stored.data.name,
      email: stored.data.email,
      phone: stored.data.phone,
      password: hashedPw
    });

    delete otpStore[email];

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// -------------------------
// LOGIN: SEND OTP
// -------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000
    };

    console.log(`📧 LOGIN OTP → ${email}: ${otp}`);

    await brevo.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER },
      to: [{ email }],
      subject: "Your Login OTP",
      htmlContent: `<h2>Your OTP: ${otp}</h2>`
    });

    res.json({ otpSent: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------
// VERIFY LOGIN OTP
// -------------------------
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore[email];
    if (!stored) return res.status(400).json({ message: "OTP expired" });

    if (stored.expires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (stored.otp != otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findOne({ email });
    delete otpStore[email];

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ success: true, user, token });
  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};
