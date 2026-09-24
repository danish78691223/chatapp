import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import VideoPlayer from "./components/VideoPlayer";
import SubscriptionPage from "./pages/SubscriptionPage";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import LoginOtp from "./pages/LoginOtp";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/home" : "/login"} replace />} />
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/home" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/home" replace />} />
        <Route path="/login-otp" element={<LoginOtp setUser={setUser} />} />
        <Route path="/home" element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" replace />} />
        <Route path="/chat/:groupId" element={user ? <Home user={user} setUser={setUser} /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/subscription" element={user ? <SubscriptionPage /> : <Navigate to="/login" replace />} />
        <Route path="/success" element={user ? <SubscriptionSuccess /> : <Navigate to="/login" replace />} />
        <Route path="/player" element={user ? <VideoPlayer /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
