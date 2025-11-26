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
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Available Groups</h2>

      {groups.length === 0 ? (
        <p style={{ textAlign: "center" }}>No groups available yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {groups.map((group) => (
            <li
              key={group._id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "12px",
                borderRadius: "10px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  marginBottom: "5px",
                  cursor: "pointer",
                  color: "#1976D2",
                }}
                onClick={() => handleOpenGroup(group._id)}
              >
                {group.name}
              </h3>

              <p style={{ fontSize: "14px", color: "#555" }}>
                Members: {group.members.length} | Creator:{" "}
                {group.creator?.name || "Unknown"}
              </p>

              {!group.members.some((m) => m._id === userId) ? (
                <button
                  onClick={() => handleJoin(group._id)}
                  style={{
                    background: "#4CAF50",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  Join Group
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    background: "#ccc",
                    color: "#333",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: "none",
                    marginTop: "8px",
                  }}
                >
                  Already Joined
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Groups;
