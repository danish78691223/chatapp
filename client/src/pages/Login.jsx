import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "../api/axios";
import "./Login.css";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(API_BASE + "/api/auth/login", { email, password });
      if (res.data.otpSent) {
        sessionStorage.setItem("loginEmail", email);
        navigate("/login-otp");
      } else alert(res.data?.message || "Unable to continue");
    } catch (err) { alert(err.response?.data?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return <div className="auth-page">
    <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
    <div className="auth-brand"><div>W</div><strong>WEBCHAT</strong><span>by WebXWhale</span></div>
    <section className="auth-card">
      <span className="eyebrow">WELCOME BACK</span><h1>Continue the<br /><span>conversation.</span></h1>
      <p className="auth-subtitle">Sign in to your private WEBCHAT workspace.</p>
      <form onSubmit={handleLogin}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required /></label>
        <button className="auth-submit" disabled={loading}>{loading ? "Sending OTP..." : "Continue with email"}</button>
      </form>
      <p className="auth-footer">New to WEBCHAT? <Link to="/register">Create an account</Link></p>
    </section>
    <div className="auth-note">🔐 Private messaging &nbsp; • &nbsp; ⚡ Real-time &nbsp; • &nbsp; Calls</div>
  </div>;
};
export default Login;