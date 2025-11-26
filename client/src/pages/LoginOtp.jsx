import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginOtp.css";

const API_BASE = process.env.REACT_APP_API_URL;

const LoginOtp = ({ setUser }) => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const email = sessionStorage.getItem("loginEmail");

  if (!email) navigate("/login");

  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login-verify`, {
        email,
        otp,
      });

      if (res.data.success) {
        localStorage.setItem("user", JSON.stringify(res.data));
        setUser(res.data);
        alert("Login successful!");
        navigate("/home");
      }
    } catch (error) {
      console.error("OTP Verify Error:", error);
      alert(error.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-box">
        <h2>Verify OTP</h2>

        <form onSubmit={handleVerify}>
          <input
            type="text"
            className="otp-input"
            placeholder="Enter OTP"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <button className="otp-btn" type="submit">
            Verify OTP
          </button>
        </form>

        <p className="email-info">OTP sent to <strong>{email}</strong></p>
      </div>
    </div>
  );
};

export default LoginOtp;
