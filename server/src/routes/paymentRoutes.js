import express from "express";
import { createOrder, verifyPayment, getPlans, getUserPlan } from "../controllers/paymentController.js";

const router = express.Router();

router.get("/plans", getPlans);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/plan/:userId", getUserPlan);

export default router;
