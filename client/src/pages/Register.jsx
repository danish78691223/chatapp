import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

const Register = () => {
  const [formData, setFormData] = useState({ name:"", email:"", phone:"", password:"" });
  const [otp, setOtp] = useState(""); const [showOtp, setShowOtp] = useState(false); const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const change = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const sendOtp = async (e) => { e.preventDefault(); setLoading(true); try { const r=await API.post("/auth/send-otp",formData); if(r.data?.success)setShowOtp(true); else alert(r.data?.message||"Unable to send OTP"); } catch(err){alert(err.response?.data?.message||"Failed to send OTP")} finally{setLoading(false)} };
  const verify = async () => { setLoading(true); try { const r=await API.post("/auth/verify-otp",{email:formData.email,otp}); if(r.data?.success)navigate("/login"); else alert(r.data?.message||"Invalid OTP"); } catch(err){alert(err.response?.data?.message||"Verification failed")} finally{setLoading(false)} };
  return <div className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <div className="auth-brand"><div>W</div><strong>WEBCHAT</strong><span>by WebXWhale</span></div>
    <section className="auth-card auth-card-register"><span className="eyebrow">CREATE ACCOUNT</span><h1>Start your<br /><span>private space.</span></h1><p className="auth-subtitle">Create an account and start conversations securely.</p>
      <form onSubmit={sendOtp}>
        <label>Name<input name="name" value={formData.name} onChange={change} placeholder="Full name" required/></label>
        <label>Email<input type="email" name="email" value={formData.email} onChange={change} placeholder="you@example.com" required/></label>
        <label>Phone<input name="phone" value={formData.phone} onChange={change} placeholder="+91 00000 00000" required/></label>
        <label>Password<input type="password" name="password" value={formData.password} onChange={change} placeholder="Create a password" required/></label>
        <button className="auth-submit" disabled={loading}>{loading?"Sending...":"Create account"}</button>
      </form>
      <p className="auth-footer">Already have an account? <span onClick={()=>navigate("/login")}>Sign in</span></p>
    </section>
    {showOtp&&<div className="modal-backdrop"><div className="create-modal"><span className="eyebrow">VERIFY EMAIL</span><h3>Enter your OTP</h3><p>We sent a 6-digit code to {formData.email}.</p><input className="otp-field" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6}/><div className="modal-actions"><button className="secondary-cta" onClick={()=>setShowOtp(false)}>Cancel</button><button className="primary-cta" onClick={verify} disabled={loading}>{loading?"Verifying...":"Verify"}</button></div></div></div>}
  </div>;
};
export default Register;