import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Track user watch time (SECONDS VERSION)
router.post("/track", protect, async (req, res) => {
  try {
    const { watchedSeconds } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const today = new Date().toDateString();
    const lastWatch = user.subscription.lastWatchedDate?.toDateString();

    // Reset daily counter if a new day
    if (today !== lastWatch) {
      user.subscription.minutesWatchedToday = 0; // storing SECONDS actually
      user.subscription.lastWatchedDate = new Date();
    }

    // ⏱ Store seconds, not minutes
    user.subscription.minutesWatchedToday += watchedSeconds;
    user.subscription.lastWatchedDate = new Date();

    const limit = user.subscription.watchLimitMinutes; // limit in minutes

    // ⛔ Limit check (convert limit to seconds)
    if (
      limit !== "unlimited" &&
      user.subscription.minutesWatchedToday >= limit * 60
    ) {
      await user.save();
      return res.status(403).json({ message: "Watch limit exceeded" });
    }

    await user.save();
    res.json({ message: "Watch time updated" });
  } catch (err) {
    console.error("Watch error:", err);
    res.status(500).json({ message: "Failed to update watch time" });
  }
});

export default router;
