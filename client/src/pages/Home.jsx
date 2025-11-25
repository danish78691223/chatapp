import React, { useEffect, useState } from "react";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";
import ChatPage from "./ChatPage";
import "./Home.css";

const Home = ({ user, setUser }) => {
  const stored = JSON.parse(localStorage.getItem("user"));
  const token = stored?.token;

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const currentUserId = user?.user?._id || user?._id;

  // ✅ Fetch Groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await API.get("/groups");
        setGroups(res.data);
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };
    if (token) fetchGroups();
  }, [token]);

  // ✅ Create Group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return alert("Please enter group name!");

    try {
      await API.post("/groups", { name: newGroupName });

      alert("✅ Group created successfully!");
      setShowCreateModal(false);
      setNewGroupName("");

      const updated = await API.get("/groups");
      setGroups(updated.data);
    } catch (error) {
      console.error("🔥 Error creating group:", error);
      alert(error.response?.data?.message || "Error creating group");
    }
  };

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  // ✅ Check if member or creator
  const isMember = selectedGroup?.members?.some(
    (m) => (m?._id || m) === currentUserId
  );

  const isCreator =
    selectedGroup?.creator?._id === currentUserId ||
    selectedGroup?.creator === currentUserId;

  return (
    <div className="chatapp-shell">

      {/* Sidebar */}
      <Sidebar
        groups={groups}
        selectedGroup={selectedGroup}
        setSelectedGroup={(g) => {
          setSelectedGroup(g);
          window.history.pushState({}, "", `/chat/${g._id}`);
        }}
        onLogout={handleLogout}
        onShowModal={() => setShowCreateModal(true)}
      />

      {/* Chat Area */}
      <div className="chat-area">
        {selectedGroup ? (
          (isMember || isCreator) ? (
            <ChatPage selectedGroup={selectedGroup} />
          ) : (
            <div style={{ textAlign: "center", marginTop: "120px" }}>
              <h2>Join Group To Chat</h2>
              <button
                onClick={async () => {
                  try {
                    await API.post(`/groups/${selectedGroup._id}/join`);
                    const updated = await API.get("/groups");
                    setGroups(updated.data);
                    alert("✅ Joined group successfully!");
                  } catch (err) {
                    console.error("Join group error:", err);
                    alert(err.response?.data?.message || "Join failed");
                  }
                }}
                style={{
                  background: "#3ad76b",
                  border: "none",
                  color: "white",
                  padding: "10px 25px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "1rem",
                  marginTop: "12px",
                  cursor: "pointer"
                }}
              >
                JOIN
              </button>
            </div>
          )
        ) : (
          <div className="welcome-placeholder">
            <h2>Welcome to Chat App</h2>
            <p>Select a group to start chatting.</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal">
          <input
            type="text"
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button onClick={handleCreateGroup}>Create</button>
          <button onClick={() => setShowCreateModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default Home;
