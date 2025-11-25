// server/src/routes/groupRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGroup,
  joinGroup,
  addMember,
  getUserGroups,
  getAllGroups,
} from "../controllers/groupController.js";

const router = express.Router();

// 🧾 GET ALL GROUPS
router.get("/", getAllGroups);

// 🆕 CREATE NEW GROUP
router.post("/", protect, createGroup);

// 🚪 USER JOINS GROUP
router.post("/:groupId/join", protect, joinGroup);

// ➕ ADD MEMBER (Admin Action)
router.post("/:groupId/addMember", protect, addMember);

// 👥 GET USER'S GROUPS
router.get("/user/:userId", getUserGroups);

export default router;
