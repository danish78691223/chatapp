// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios"; // API instance

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [otp, setOtp] = useState("");
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // input change handler
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // STEP 1: Send OTP
  const sendOtp = async () => {
    try {
      setLoading(true);

      const res = await API.post("/auth/send-otp", formData);

      console.log("Send OTP Response:", res.data);

      if (res.data?.success) {
        setShowOtpPopup(true);
        alert("OTP generated! Check your email (sent via Resend).");
      } else {
        alert(res.data?.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP Error:", error);
      alert(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP + Register
  const verifyOtpAndRegister = async () => {
    try {
      setLoading(true);

      const res = await API.post("/auth/verify-otp", {
        email: formData.email,
        otp,
      });

      console.log("Verify OTP Response:", res.data);

      if (res.data?.success) {
        alert("Registration successful!");
        navigate("/login");
      } else {
        alert(res.data?.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("Verify OTP Error:", error);
      alert(error.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    sendOtp();
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Create Account</h2>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={styles.input}
        />

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Please wait..." : "Send OTP"}
        </button>

        <p style={{ textAlign: "center", marginTop: "10px" }}>
          Already have an account?{" "}
          <span
            style={{ color: "#2575fc", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </form>

      {/* OTP POPUP */}
      {showOtpPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <h3>Enter OTP</h3>
            <p>We sent a 6-digit OTP to your email.</p>

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.otpInput}
              maxLength={6}
            />

            <button
              onClick={verifyOtpAndRegister}
              style={styles.verifyBtn}
              disabled={loading}
              type="button"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              onClick={() => setShowOtpPopup(false)}
              style={styles.cancelBtn}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    backgroundColor: "#fff",
    padding: "40px 30px",
    borderRadius: "12px",
    width: "320px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  },
  title: {
    marginBottom: "20px",
    textAlign: "center",
    fontSize: "1.8rem",
    fontWeight: "700",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1.8px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    width: "100%",
    padding: "12px 0",
    backgroundColor: "#2575fc",
    color: "#fff",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
  },
  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    background: "#fff",
    padding: "30px 20px",
    width: "300px",
    borderRadius: "10px",
    textAlign: "center",
  },
  otpInput: {
    width: "100%",
    padding: "10px",
    fontSize: "1.2rem",
    borderRadius: "8px",
    border: "1px solid #bbb",
    textAlign: "center",
    marginBottom: "15px",
  },
  verifyBtn: {
    width: "100%",
    padding: "12px",
    background: "#28a745",
    color: "#fff",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  cancelBtn: {
    width: "100%",
    padding: "10px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default Register;
