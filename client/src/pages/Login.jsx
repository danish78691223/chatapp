import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const user = storedUser?.user || storedUser;
  const userId = user?._id;

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await API.get("/groups");
        setGroups(res.data);
      } catch (err) {
        console.error("❌ Error:", err);
      }
    };
    fetchGroups();
  }, []);

  const handleJoin = async (groupId) => {
    try {
      const res = await API.post(`/groups/${groupId}/join`);
      alert(res.data.message);
      const updated = await API.get("/groups");
      setGroups(updated.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openGroup = (id) => navigate(`/chat/${id}`);

  return (
    <div className="login-page">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br />

        <button type="submit">Send OTP</button>
      </form>

      <p className="register-link">
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;
