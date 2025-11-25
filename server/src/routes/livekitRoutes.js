// src/routes/livekitRoutes.js
import express from "express";
import { AccessToken } from "livekit-server-sdk";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.get("/livekit-token/:room/:userId", async (req, res) => {
  const { room, userId } = req.params;

  try {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userId,
        ttl: 3600,
      }
    );

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.json({
      token: token.toJwt(),        // ✅ REAL JWT STRING
      serverUrl: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Token Error:", error);
    return res.status(500).json({ message: "Token generation failed" });
  }
});

export default router;
