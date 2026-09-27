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
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
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
  const isAdmin = Boolean(selectedGroup?.isAdmin || isCreator);

  const refreshGroups = async (keepSelected = true) => {
    const res = await API.get("/groups");
    setGroups(res.data);
    if (keepSelected && selectedGroup?._id) {
      const updated = res.data.find((g) => String(g._id) === String(selectedGroup._id));
      if (updated) setSelectedGroup(updated);
    }
    return res.data;
  };

  const loadJoinRequests = async (groupId = selectedGroup?._id) => {
    if (!groupId || !isAdmin) return;
    setLoadingRequests(true);
    try {
      const res = await API.get("/groups/" + groupId + "/join-requests");
      setJoinRequests(res.data || []);
    } catch (e) {
      console.error("Join request fetch error:", e);
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!selectedGroup?._id || !isAdmin) {
      setJoinRequests([]);
      return;
    }
    loadJoinRequests(selectedGroup._id);
    const timer = window.setInterval(() => loadJoinRequests(selectedGroup._id), 5000);
    return () => window.clearInterval(timer);
  }, [selectedGroup?._id, isAdmin]);

  return (
    <div className="webchat-app">
      <Sidebar groups={groups} currentUserId={currentUserId} selectedGroup={selectedGroup} setSelectedGroup={selectGroup} onLogout={logout} onShowModal={() => setShowCreateModal(true)} user={user} />
      <main className="webchat-main">
        {!notificationsEnabled && "Notification" in window && Notification.permission !== "denied" && (
          <button className="notification-optin" onClick={async () => setNotificationsEnabled((await Notification.requestPermission()) === "granted")}>Enable notifications</button>
        )}
        {selectedGroup ? (
          (isMember || isCreator) ? (
            <div className="chat-with-requests">
              <ChatPage selectedGroup={selectedGroup} />
              {isAdmin && (
                <aside className="join-requests-panel">
                  <div className="join-requests-header">
                    <div><span className="eyebrow">GROUP ADMIN</span><h3>Join Requests</h3></div>
                    <span className="request-count">{joinRequests.length}</span>
                  </div>
                  {loadingRequests ? <p className="request-muted">Loading requests...</p> :
                    joinRequests.length === 0 ? <p className="request-muted">No pending requests.</p> :
                    <div className="request-list">
                      {joinRequests.map((request) => (
                        <div className="join-request-item" key={request._id}>
                          <div className="request-avatar">{(request.user?.name || "?").charAt(0).toUpperCase()}</div>
                          <div className="request-user">
                            <strong>{request.user?.name || "Unknown user"}</strong>
                            <small>{request.user?.email || request.user?.phone || "Wants to join this group"}</small>
                          </div>
                          <div className="request-actions">
                            <button className="approve-request" onClick={async () => {
                              try {
                                await API.post("/groups/" + selectedGroup._id + "/join-requests/" + request._id + "/respond", { action: "approve" });
                                await refreshGroups();
                                await loadJoinRequests(selectedGroup._id);
                              } catch (e) { alert(e.response?.data?.message || "Could not approve request"); }
                            }}>Approve</button>
                            <button className="reject-request" onClick={async () => {
                              try {
                                await API.post("/groups/" + selectedGroup._id + "/join-requests/" + request._id + "/respond", { action: "reject" });
                                await loadJoinRequests(selectedGroup._id);
                              } catch (e) { alert(e.response?.data?.message || "Could not reject request"); }
                            }}>Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>}
                </aside>
              )}
            </div>
          ) : (
            <section className="join-screen"><div className="join-card">
              <span className="eyebrow">PRIVATE SPACE</span><h2>Join {selectedGroup.name}</h2>
              {selectedGroup.joinRequestStatus === "pending" ? (
                <>
                  <p>Your join request has been sent. A group admin must approve it before you can enter the conversation.</p>
                  <button className="join-pending-btn" disabled>Request Pending</button>
                </>
              ) : selectedGroup.joinRequestStatus === "rejected" ? (
                <>
                  <p>Your previous request was rejected. You can send a new request to the group admin.</p>
                  <button onClick={async () => {
                    try { await API.post("/groups/" + selectedGroup._id + "/join"); await refreshGroups(); }
                    catch (e) { alert(e.response?.data?.message || "Join request failed"); }
                  }}>Request to Join Again</button>
                </>
              ) : (
                <>
                  <p>Send a request to the group admin. You will be added only after approval.</p>
                  <button onClick={async () => {
                    try { await API.post("/groups/" + selectedGroup._id + "/join"); await refreshGroups(); }
                    catch (e) { alert(e.response?.data?.message || "Join request failed"); }
                  }}>Request to Join</button>
                </>
              )}
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
