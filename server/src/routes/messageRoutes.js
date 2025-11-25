import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  sendMessage, 
  getMessages, 
  getGroupMessages, 
  sendGroupMessage 
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/group/:groupId", protect, getGroupMessages);
router.post("/group/:groupId", protect, sendGroupMessage);

// Private chat
router.post("/", protect, sendMessage);
router.get("/:userId1/:userId2", protect, getMessages);

export default router;
