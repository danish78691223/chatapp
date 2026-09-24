import React, { useEffect, useState } from "react";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";
import ChatPage from "./ChatPage";
import WebWhaleScene from "../components/WebWhaleScene";
import "./Home.css";
import socket from "../socket";

const Home = ({ user, setUser }) => {
  const stored = JSON.parse(localStorage.getItem("user"));
  const token = stored?.token;
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const currentUserId = user?.user?._id || user?._id;
  const currentName = user?.user?.name || user?.name || "there";

  useEffect(() => {
    if (!currentUserId) return;
    socket.emit("register-user", currentUserId);
    const onMessage = (msg) => {
      if (!msg?.groupId || String(msg.sender) === String(currentUserId)) return;
      const open = String(selectedGroup?._id) === String(msg.groupId);
      setGroups((prev) => prev.map((g) => String(g._id) === String(msg.groupId)
        ? { ...g, lastMessage: "Encrypted message", unreadCounts: { ...(g.unreadCounts || {}), [currentUserId]: open ? 0 : Number(g.unreadCounts?.[currentUserId] || 0) + 1 } } : g));
      if (!open && notificationsEnabled && "Notification" in window && Notification.permission === "granted") new Notification("WEBCHAT", { body: "You received a new encrypted message." });
    };
    socket.on("receive_group_message", onMessage);
    return () => socket.off("receive_group_message", onMessage);
  }, [currentUserId, selectedGroup?._id, notificationsEnabled]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/groups");
        setGroups(res.data);
        const id = window.location.pathname.split("/chat/")[1];
        const found = id && res.data.find((g) => String(g._id) === String(id));
        if (found) setSelectedGroup(found);
      } catch (e) { console.error(e); }
    };
    if (token) load();
  }, [token]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await API.post("/groups", { name: newGroupName.trim() });
      const res = await API.get("/groups");
      setGroups(res.data);
      setNewGroupName("");
      setShowCreateModal(false);
    } catch (e) { alert(e.response?.data?.message || "Could not create conversation"); }
  };

  const logout = () => {
    localStorage.removeItem("user");
    sessionStorage.clear();
    setUser(null);
    window.location.href = "/login";
  };

  const selectGroup = (g) => {
    setSelectedGroup(g);
    window.history.pushState({}, "", "/chat/" + g._id);
  };

  const isMember = selectedGroup?.members?.some((m) => String(m?._id || m) === String(currentUserId));
  const isCreator = String(selectedGroup?.creator?._id || selectedGroup?.creator) === String(currentUserId);

  return (
    <div className="webchat-app">
      <Sidebar groups={groups} currentUserId={currentUserId} selectedGroup={selectedGroup} setSelectedGroup={selectGroup} onLogout={logout} onShowModal={() => setShowCreateModal(true)} user={user} />
      <main className="webchat-main">
        {!notificationsEnabled && "Notification" in window && Notification.permission !== "denied" && (
          <button className="notification-optin" onClick={async () => setNotificationsEnabled((await Notification.requestPermission()) === "granted")}>Enable notifications</button>
        )}
        {selectedGroup ? (
          (isMember || isCreator) ? <ChatPage selectedGroup={selectedGroup} /> : (
            <section className="join-screen"><div className="join-card">
              <span className="eyebrow">PRIVATE SPACE</span><h2>Join {selectedGroup.name}</h2>
              <p>You have been invited to this conversation.</p>
              <button onClick={async () => {
                try { await API.post("/groups/" + selectedGroup._id + "/join"); const r = await API.get("/groups"); setGroups(r.data); setSelectedGroup(r.data.find((g) => g._id === selectedGroup._id) || selectedGroup); }
                catch (e) { alert(e.response?.data?.message || "Join failed"); }
              }}>Join conversation</button>
            </div></section>
          )
        ) : (
          <section className="webchat-home">
            <div className="home-copy">
              <span className="eyebrow">WEBXWHALE • WEBCHAT</span>
              <h1>Good to see you,<br /><span>{currentName.split(" ")[0]}.</span></h1>
              <p>Private conversations, real-time messages and calls — in one focused workspace.</p>
              <div className="home-actions">
                <button className="primary-cta" onClick={() => setShowCreateModal(true)}>Start a conversation</button>
                <button className="secondary-cta" onClick={() => window.location.href = "/profile"}>Open profile</button>
              </div>
              <div className="feature-row"><span><b>01</b> Private by design</span><span><b>02</b> Real-time</span><span><b>03</b> Voice & video</span></div>
            </div>
            <div className="home-visual">
              <div className="visual-glow" />
              <WebWhaleScene />
              <div className="visual-card visual-card-top"><span className="dot" /> Online <strong>{groups.length}</strong></div>
              <div className="visual-card visual-card-bottom"><span>⌁</span><div><strong>Secure messaging</strong><small>Encrypted conversations</small></div></div>
            </div>
          </section>
        )}
      </main>
      {showCreateModal && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="create-modal">
            <span className="eyebrow">NEW CONVERSATION</span><h3>Create a private space</h3>
            <p>Name your conversation and start chatting.</p>
            <input autoFocus value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGroup()} placeholder="e.g. Project team" />
            <div className="modal-actions"><button className="secondary-cta" onClick={() => setShowCreateModal(false)}>Cancel</button><button className="primary-cta" onClick={createGroup}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
