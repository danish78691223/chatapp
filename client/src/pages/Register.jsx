// src/pages/Register.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/axios";

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

  // update field values
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // STEP 1: Send OTP
  const sendOtp = async () => {
    try {
      setLoading(true);

      await axios.post(`${API_BASE}/api/auth/send-otp`, formData);

      setShowOtpPopup(true);
      alert("OTP sent to your email!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  // STEP 2: Verify OTP and register
  const verifyOtpAndRegister = async () => {
    try {
      setLoading(true);

      await axios.post(`${API_BASE}/api/auth/verify-otp`, {
        ...formData,
        otp,
      });

      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    }
    setLoading(false);
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
          {loading ? "Please wait..." : "Register"}
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
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              onClick={() => setShowOtpPopup(false)}
              style={styles.cancelBtn}
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
