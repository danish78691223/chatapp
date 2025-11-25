import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requestDownload, getMyDownloads } from "../controllers/downloadController.js";

const router = express.Router();

// ✅ Ask backend if user can download this video
router.post("/request", protect, requestDownload);

// ✅ Get all downloads for logged-in user
router.get("/my", protect, getMyDownloads);

export default router;
