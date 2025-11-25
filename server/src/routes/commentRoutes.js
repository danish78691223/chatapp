import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addComment,
  getComments,
  likeComment,
  dislikeComment,
  translateComment
} from "../controllers/commentController.js";

const router = express.Router();

router.post("/add", protect, addComment);
router.get("/:videoUrl", protect, getComments);
router.post("/like/:commentId", protect, likeComment);
router.post("/dislike/:commentId", protect, dislikeComment);
router.post("/translate", translateComment);

export default router;
