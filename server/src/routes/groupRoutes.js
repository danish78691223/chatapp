// server/src/routes/groupRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGroup,
  joinGroup,
  addMember,
  getUserGroups,
  getAllGroups,
  getJoinRequests,
  respondToJoinRequest,
} from "../controllers/groupController.js";

const router = express.Router();

router.get("/", protect, getAllGroups);
router.post("/", protect, createGroup);
router.post("/:groupId/join", protect, joinGroup);
router.get("/:groupId/join-requests", protect, getJoinRequests);
router.post("/:groupId/join-requests/:requestId/respond", protect, respondToJoinRequest);
router.post("/:groupId/addMember", protect, addMember);
router.get("/user/:userId", getUserGroups);

export default router;
