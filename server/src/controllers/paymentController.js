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

export const getPlans = (req, res) => {
  return res.json({ success: true, plans: PLANS });
};

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan]) return res.status(400).json({ message: "Invalid plan" });

    const amount = PLANS[plan].price * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: "Payment creation failed" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ message: "Invalid signature" });

    const user = await User.findById(userId);

    user.subscription.plan = plan;
    user.subscription.watchLimitMinutes = PLANS[plan].minutes;
    await user.save();

    // Generate invoice PDF
    const invoicePath = await generateInvoice(user, plan, PLANS[plan].price);

    // Send via Brevo
    await sendInvoiceEmail(user.email, plan, PLANS[plan].price, invoicePath);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Payment verification failed" });
  }
};
