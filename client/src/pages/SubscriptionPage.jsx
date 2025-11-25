import React, { useEffect, useState, useCallback } from "react";
import API from "../api/axios";
import "./SubscriptionPage.css";

const SubscriptionPage = () => {
  const [userPlan, setUserPlan] = useState("free");
  const [loading, setLoading] = useState(false);

  const stored = JSON.parse(localStorage.getItem("user"));
  const userId = stored?.user?._id || stored?._id;

  const fetchUserPlan = useCallback(async () => {
    try {
      const res = await API.get(`/payment/plan/${userId}`);
      setUserPlan(res.data.plan || "free");
    } catch (error) {
      console.error("❌ Error fetching plan:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchUserPlan();
  }, [fetchUserPlan, userId]);

  // ============================
  // OPEN RAZORPAY CHECKOUT
  // ============================
  const openRazorpay = (order, plan) => {
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY,
      amount: order.amount, // paise
      currency: "INR",
      name: "Video Subscription",
      description: `Upgrade to ${plan}`,
      order_id: order.id, // MUST be the Razorpay order id

      handler: async (response) => {
        try {
          await API.post("/payment/verify-payment", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId,
            plan,
          });

          alert("🎉 Payment Successful! Your plan has been upgraded.");
          fetchUserPlan(); // refresh plan
        } catch (error) {
          console.error("❌ Payment verification failed:", error);
          alert("Verification failed");
        }
      },

      theme: { color: "#4E73DF" },
      prefill: {
        name: stored?.user?.name || "",
        email: stored?.user?.email || "",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // ============================
  // HANDLE BUY
  // ============================
  const handleBuy = async (plan) => {
    setLoading(true);

    try {
      const res = await API.post("/payment/create-order", { plan });

      // res.data.order is returned by the new backend
      const order = res.data?.order;
      if (!order || !order.id) {
        throw new Error("Invalid order returned from server");
      }

      openRazorpay(order, plan);
    } catch (err) {
      console.error("Payment start error:", err);
      alert("Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-container">
      <h2>Choose Your Plan</h2>

      <p className="current-plan">
        Current Plan: <strong>{userPlan?.toUpperCase()}</strong>
      </p>

      <div className="plans">
        <div className="plan-box free">
          <h3>FREE</h3>
          <p>5 minutes per day</p>
          <button disabled>Active</button>
        </div>

        <div className="plan-box bronze">
          <h3>BRONZE</h3>
          <p>7 minutes</p>
          <h4>Rs 10</h4>
          <button onClick={() => handleBuy("bronze")} disabled={loading}>
            Upgrade
          </button>
        </div>

        <div className="plan-box silver">
          <h3>SILVER</h3>
          <p>10 minutes</p>
          <h4>Rs 50</h4>
          <button onClick={() => handleBuy("silver")} disabled={loading}>
            Upgrade
          </button>
        </div>

        <div className="plan-box gold">
          <h3>GOLD</h3>
          <p>Unlimited</p>
          <h4>Rs 100</h4>
          <button onClick={() => handleBuy("gold")} disabled={loading}>
            Go Premium
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
