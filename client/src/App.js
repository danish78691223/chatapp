// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
//import Groups from "./pages/Groups";
//import ChatPage from "./pages/ChatPage";
import VideoPlayer from "./components/VideoPlayer";
import SubscriptionPage from "./pages/SubscriptionPage";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import LoginOtp from "./pages/LoginOtp";


function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");


  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
  const applyTheme = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/location");
      const loc = await res.json();

      const state = loc.state;
      const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
      const hour = new Date().getHours();

      const isSouth = southStates.includes(state);

      if (hour >= 10 && hour <= 12 && isSouth) {
        setTheme("light");
        document.body.className = "light-theme";
      } else {
        setTheme("dark");
        document.body.className = "dark-theme";
      }
    } catch (err) {
      console.log("Theme Location Error:", err.message);
      document.body.className = "dark-theme";
    }
  };

  applyTheme();
}, []);



  return (
    <Router>
  <Routes>
    <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />

    <Route
      path="/login"
      element={!user ? <Login setUser={setUser} /> : <Navigate to="/home" replace />}
    />

    <Route
      path="/register"
      element={!user ? <Register /> : <Navigate to="/home" replace />}
    />

    <Route
      path="/home"
      element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" />}
    />

    {/* ✅ PROFILE PAGE FIXED ROUTE */}
    <Route
      path="/profile"
      element={user ? <Profile user={user} /> : <Navigate to="/login" />}
    />

    {/* ✅ CHAT ROUTE MUST LOAD Home (layout) */}
    <Route
      path="/chat/:groupId"
      element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" />}
    />
    <Route path="/subscription" element={<SubscriptionPage />} />
    <Route path="/success" element={<SubscriptionSuccess />} />
    <Route
      path="/player"
      element={user ? <VideoPlayer /> : <Navigate to="/login" />}
    />
    <Route path="/login-otp" element={<LoginOtp setUser={setUser} />} />


  </Routes>
</Router>

  );
}

export default App;
