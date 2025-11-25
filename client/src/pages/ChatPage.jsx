// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import "./ChatPage.css";
import socket from "../socket";

import EmojiPicker from "emoji-picker-react";
import VideoPlayer from "../components/VideoPlayer";
import CommentSidebar from "../components/CommentSidebar";
import CallModal from "../components/CallModal";
import DirectCallModal from "../components/DirectCallModal";

const ChatPage = ({ selectedGroup }) => {
  const params = useParams();
  const groupId = params.groupId || window.currentGroupId;

  const stored = JSON.parse(localStorage.getItem("user"));
  const userId = stored?.user?._id || stored?._id;

  // ---------------- GROUP CALL STATES ----------------
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [roomName, setRoomName] = useState(null);

  // ---------------- DIRECT CALL STATES ----------------
  const [showMembersPopup, setShowMembersPopup] = useState(false);
  const [directCallTarget, setDirectCallTarget] = useState(null);
  const [showDirectCallModal, setShowDirectCallModal] = useState(false);
  const [incomingDirectCall, setIncomingDirectCall] = useState(null);

  // ---------------- MESSAGES ----------------
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  // ---------------- VIDEO PLAYER ----------------
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showComments, setShowComments] = useState(false);

  // ---------------- UPLOAD ----------------
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);

  // ---------------- JOIN SOCKET ROOM ----------------
  useEffect(() => {
    if (!groupId) return;
    socket.emit("join_group", groupId);

    return () => {
      socket.emit("leave_group", groupId);
    };
  }, [groupId]);

  // ---------------- REGISTER USER for DIRECT CALLS ----------------
  useEffect(() => {
    if (!userId) return;

    socket.emit("register-user", userId);

    const handleIncomingDirect = ({ fromUserId, offer }) => {
      setIncomingDirectCall({ fromUserId, offer });
    };

    socket.on("incoming-call", handleIncomingDirect);

    return () => {
      socket.off("incoming-call", handleIncomingDirect);
    };
  }, [userId]);

  // ---------------- FETCH MESSAGES ----------------
  useEffect(() => {
    if (!groupId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/messages/group/${groupId}`);
        setMessages(res.data);
      } catch (err) {
        console.error("Fetch msg error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [groupId]);

  // ---------------- LIVE MESSAGES ----------------
  useEffect(() => {
    const handler = (msg) => {
      if (msg.groupId === groupId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive_group_message", handler);
    return () => socket.off("receive_group_message", handler);
  }, [groupId]);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- SEND TEXT MESSAGE ----------------
  const handleSend = async () => {
    if (!text.trim()) return;

    const payload = { groupId, sender: userId, text };

    socket.emit("send_group_message", payload);

    try {
      await API.post(`/messages/group/${groupId}`, payload);
    } catch (err) {
      console.error("Error sending message:", err);
    }

    setText("");
  };

  // ---------------- FILE UPLOAD ----------------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const payload = {
        groupId,
        sender: userId,
        file: res.data.url,
        fileType: res.data.type,
        text: "",
      };

      socket.emit("send_group_message", payload);
      await API.post(`/messages/group/${groupId}`, payload);
    } catch (err) {
      console.error("Upload error:", err);
    }

    setUploading(false);
    setUploadPreview(null);
  };

  // ---------------- OPEN VIDEO PLAYER ----------------
  const handleOpenVideo = (url) => {
    setCurrentVideo(url);
    setShowVideoPlayer(true);
  };

  // ---------------- GROUP CALL LISTENER ----------------
  useEffect(() => {
    const handler = (data) => {
      if (data.groupId === groupId) {
        setIncomingGroupCall(data);
      }
    };

    socket.on("incoming-group-call", handler);
    return () => socket.off("incoming-group-call", handler);
  }, [groupId]);

  // ---------------- START GROUP CALL (using LiveKit/WebRTC backend) ----------------
  // ---------------- START GROUP CALL (pure WebRTC mesh) ----------------
const startGroupCall = () => {
  if (!groupId || !userId) return;

  const room = `group_${groupId}`;
  setRoomName(room);

  // Notify others in this group (just for banner)
  socket.emit("start-group-call", {
    groupId,
    callerId: userId,
    callerName: stored?.user?.name || stored?.name || "Someone",
  });

  setShowCallModal(true);
};

const joinGroupCall = () => {
  if (!groupId || !userId) return;

  const room = `group_${groupId}`;
  setRoomName(room);
  setShowCallModal(true);
};


  // --------------------------------------------------
  //  RETURN JSX
  // --------------------------------------------------
  return (
    <div className="chat-page">
      {/* 🔔 GROUP CALL BANNER */}
      {incomingGroupCall && !showCallModal && (
        <div className="group-call-banner">
          <span>📞 {incomingGroupCall.callerName} started a group call</span>

          <button className="join-call-btn" onClick={joinGroupCall}>
            Join
          </button>

          <button
            className="dismiss-call-btn"
            onClick={() => setIncomingGroupCall(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 🔔 INCOMING DIRECT CALL */}
      {incomingDirectCall && !showDirectCallModal && (
        <div className="incoming-direct-call">
          <span>
            📲{" "}
            {selectedGroup?.members?.find(
              (m) => m._id === incomingDirectCall.fromUserId
            )?.name || "Someone"}{" "}
            is calling you
          </span>

          <button
            className="accept-btn"
            onClick={() => {
              const caller =
                selectedGroup?.members?.find(
                  (m) => m._id === incomingDirectCall.fromUserId
                ) || { _id: incomingDirectCall.fromUserId, name: "Unknown" };

              setDirectCallTarget(caller);
              setShowDirectCallModal(true);
            }}
          >
            Accept
          </button>

          <button
            className="reject-btn"
            onClick={() => {
              socket.emit("end-call", {
                toUserId: incomingDirectCall.fromUserId,
              });
              setIncomingDirectCall(null);
            }}
          >
            Reject
          </button>
        </div>
      )}

      {/* 📞 GROUP CALL MODAL */}
      {showCallModal && (
        <CallModal
          roomName={roomName}
          userId={userId}
          onClose={() => setShowCallModal(false)}
        />
      )}

      {/* 📱 DIRECT CALL MODAL */}
      {showDirectCallModal && directCallTarget && (
        <DirectCallModal
          localUserId={userId}
          targetUser={directCallTarget}
          incomingOffer={incomingDirectCall?.offer || null}
          isCaller={!incomingDirectCall}
          onClose={() => {
            setShowDirectCallModal(false);
            setDirectCallTarget(null);
            setIncomingDirectCall(null);
          }}
        />
      )}

      {/* 🎬 VIDEO PLAYER */}
      {showVideoPlayer && currentVideo && (
        <VideoPlayer
          url={currentVideo}
          onClose={() => {
            setShowVideoPlayer(false);
            setShowComments(false);
            setCurrentVideo(null);
          }}
          onShowComments={() => setShowComments(true)}
        />
      )}

      {showComments && (
        <CommentSidebar
          videoUrl={currentVideo}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* 🧩 TOP BAR */}
      <div className="chat-top-bar">
        <div className="chat-top-info">
          <div className="group-avatar">
            {selectedGroup?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="group-title">{selectedGroup?.name}</h3>
            <p className="group-members">
              {selectedGroup?.members?.map((m) => m.name).join(", ")}
            </p>
          </div>
        </div>

        {/* 📞 GROUP CALL (top bar button) */}
        <button className="call-btn" onClick={startGroupCall}>
          📞 Call
        </button>

        {/* 👥 MEMBERS POPUP TOGGLE */}
        <button
          className="members-btn"
          onClick={() => setShowMembersPopup((p) => !p)}
        >
          👥 Members
        </button>
      </div>

      {/* MEMBERS LIST POPUP (with Group Call button) */}
      {showMembersPopup && (
        <div className="members-popup">
          <div className="members-popup-header">
            <h4>Group Members</h4>
            {/* ✅ NEW: Group Call button inside popup */}
            <button
              className="group-call-btn"
              onClick={startGroupCall}
              title="Start group video call"
            >
              📞 Group Call
            </button>
          </div>

          <ul>
            {selectedGroup?.members?.map((m) => (
              <li key={m._id} className="member-row">
                <span>{m.name}</span>

                {m._id !== userId && (
                  <button
                    className="member-call-btn"
                    onClick={() => {
                      setDirectCallTarget(m);
                      setIncomingDirectCall(null);
                      setShowMembersPopup(false);
                      setShowDirectCallModal(true);
                    }}
                  >
                    Call
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 💬 MESSAGES */}
      <div className="messages">
        {loading ? (
          <p className="loading">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="no-msg">No messages yet</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={msg.sender === userId ? "my-message" : "their-message"}
            >
              {msg.file ? (
                msg.fileType?.startsWith("video") ? (
                  <video
                    src={msg.file}
                    className="chat-media"
                    muted
                    onClick={() => handleOpenVideo(msg.file)}
                  />
                ) : (
                  <img src={msg.file} className="chat-media" alt="" />
                )
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          ))
        )}

        {uploading && uploadPreview && (
          <div className="my-message sending-bubble">
            <div className="sending-wrapper">
              <img
                src={uploadPreview}
                className="upload-preview"
                alt="upload"
              />
              <div className="progress">
                <span>Sending...</span>
                <div className="loader" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ✏ INPUT AREA */}
      <div className="send-box">
        <button className="emoji-btn" onClick={() => setShowEmoji(!showEmoji)}>😊</button>

        {showEmoji && (
          <div className="emoji-popup">
            <EmojiPicker
              onEmojiClick={(e) => setText((prev) => prev + e.emoji)}
            />
          </div>
        )}

        <label className="upload-btn">
          📎
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={handleFileUpload}
          />
        </label>

        <input
          type="text"
          placeholder="Type message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatPage;
