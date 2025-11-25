import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import generateInvoice from "../utils/generateInvoice.js";
import sendInvoiceEmail from "../utils/sendInvoiceEmail.js";

const PLANS = {
  free: { minutes: 5, price: 0 },
  bronze: { minutes: 7, price: 10 },
  silver: { minutes: 10, price: 50 },
  gold: { minutes: "unlimited", price: 100 },
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// =============================
// LIST PLANS
// =============================
export const getPlans = (req, res) => {
  return res.json({ success: true, plans: PLANS });
};

// =============================
// CREATE ORDER
// =============================
export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan]) return res.status(400).json({ message: "Invalid plan" });

    const amountInPaise = PLANS[plan].price * 100; // Razorpay needs paise

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    // return a clear order object the frontend can consume
    return res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount, // paise
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({ message: "Payment creation failed", error: error.message || error });
  }
};

// =============================
// VERIFY PAYMENT
// =============================
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !plan) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn("Signature mismatch", { expectedSignature, received: razorpay_signature });
      return res.status(400).json({ message: "Payment verification failed: signature mismatch" });
    }

    // UPDATE USER PLAN
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.subscription.plan = plan;
    user.subscription.watchLimitMinutes = PLANS[plan].minutes;
    user.subscription.minutesWatchedToday = 0;
    user.subscription.lastWatchedDate = new Date();
    await user.save();

    // GENERATE PDF INVOICE
    try {
      const invoicePath = await generateInvoice(user, plan, PLANS[plan].price);
      // SEND INVOICE EMAIL
      await sendInvoiceEmail(user.email, plan, PLANS[plan].price, invoicePath);
    } catch (emailErr) {
      console.error("Invoice/email error:", emailErr);
      // continue even if email fails
    }

    return res.json({ success: true, message: "Plan upgraded successfully" });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ message: "Payment verification failed", error: error.message || error });
  }
};

// =============================
// GET USER PLAN
// =============================
export const getUserPlan = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      plan: user.subscription.plan,
      minutesWatchedToday: user.subscription.minutesWatchedToday,
      limit: user.subscription.watchLimitMinutes,
    });
  } catch (error) {
    console.error("getUserPlan error:", error);
    return res.status(500).json({ error: error.message || error });
  }
};
