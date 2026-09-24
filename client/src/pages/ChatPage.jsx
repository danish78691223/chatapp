/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import "./ChatPage.css";
import socket from "../socket";
import { decryptFromSender, encryptForRecipient, ensureIdentity } from "../services/cryptoService";

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
  const [loadError, setLoadError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  // ---------------- VIDEO PLAYER ----------------
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showComments, setShowComments] = useState(false);

  // ---------------- UPLOAD ----------------
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const typingTimer = useRef(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [contextMessage, setContextMessage] = useState(null);

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

  const decryptGroupMessages = async (items) => {
    return Promise.all(
      items.map(async (msg) => {
        if (!msg.encryptedPayloads?.length) return msg;
        const envelope = msg.encryptedPayloads.find(
          (item) => String(item.recipient) === String(userId)
        );
        if (!envelope?.payload) return { ...msg, text: "🔒 Encrypted message" };

        try {
          const plaintext = await decryptFromSender(envelope.payload);
          return { ...msg, text: plaintext, e2ee: true };
        } catch (error) {
          console.warn("Unable to decrypt message:", error);
          return { ...msg, text: "🔒 Unable to decrypt this message", e2ee: true };
        }
      })
    );
  };

  useEffect(() => {
    const onTyping = ({ userId: typingUserId, isTyping }) => {
      if (String(typingUserId) === String(userId)) return;
      setTypingUsers((prev) => isTyping
        ? [...new Set([...prev, String(typingUserId)])]
        : prev.filter((id) => id !== String(typingUserId)));
    };
    const onPresence = ({ userId: changedUserId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        online ? next.add(String(changedUserId)) : next.delete(String(changedUserId));
        return next;
      });
    };
    socket.on("user_typing", onTyping);
    socket.on("presence_update", onPresence);
    return () => {
      socket.off("user_typing", onTyping);
      socket.off("presence_update", onPresence);
    };
  }, [userId]);

  const handleTyping = (value) => {
    setText(value);
    if (!groupId || !userId) return;
    socket.emit("typing", { groupId, userId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { groupId, userId, isTyping: false });
    }, 1200);
  };

  // ---------------- FETCH MESSAGES ----------------
  useEffect(() => {
    if (!groupId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        // Fetch the message list independently from E2EE initialization.
        // E2EE key registration must never block the chat screen forever.
        const res = await API.get(`/messages/group/${groupId}`, { timeout: 15000 });
        const items = Array.isArray(res.data) ? res.data : [];

        if (!active) return;

        // Render the conversation immediately.
        setMessages(items);
        setLoading(false);

        // Decrypt asynchronously after the UI is available.
        if (items.length) {
          try {
            await Promise.race([
              (async () => {
                await ensureIdentity();
                const decrypted = await decryptGroupMessages(items);
                if (active) setMessages(decrypted);
              })(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("E2EE initialization timed out")), 8000)
              ),
            ]);
          } catch (e2eeError) {
            console.warn("E2EE initialization/decryption deferred:", e2eeError?.message || e2eeError);
            if (active) {
              setMessages(
                items.map((msg) => ({
                  ...msg,
                  text: msg.encryptedPayloads?.length
                    ? "🔒 Encrypted message"
                    : (msg.text || ""),
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error("Fetch msg error:", err?.response?.data || err?.message || err);
        if (active) {
          setMessages([]);
          setLoadError(
            err?.code === "ECONNABORTED"
              ? "Message server took too long to respond. Please retry."
              : (err?.response?.data?.message || "Unable to load messages.")
          );
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [groupId]);

  // ---------------- LIVE MESSAGES ----------------
  useEffect(() => {
    const handler = (msg) => {
      if (msg.groupId === groupId) {
        decryptGroupMessages([msg]).then(([decrypted]) =>
          setMessages((prev) => [...prev, decrypted])
        );
      }
    };

    socket.on("receive_group_message", handler);
    return () => socket.off("receive_group_message", handler);
  }, [groupId]);

  useEffect(() => {
    const onReaction = ({ messageId, userId: reactionUserId, emoji }) => {
      setMessages((prev) => prev.map((msg) =>
        String(msg._id) === String(messageId)
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []).filter((r) => String(r.user) !== String(reactionUserId)),
                { user: reactionUserId, emoji },
              ],
            }
          : msg
      ));
    };
    const onRead = ({ messageId, userId: readUserId }) => {
      setMessages((prev) => prev.map((msg) =>
        String(msg._id) === String(messageId)
          ? { ...msg, readBy: [...new Set([...(msg.readBy || []).map(String), String(readUserId)])] }
          : msg
      ));
    };
    socket.on("message_reaction", onReaction);
    socket.on("message_read", onRead);
    return () => {
      socket.off("message_reaction", onReaction);
      socket.off("message_read", onRead);
    };
  }, [groupId]);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- SEND TEXT MESSAGE ----------------
  const handleSend = async () => {
    if (!text.trim()) return;

    const members = selectedGroup?.members || [];
    const encryptedPayloads = [];

    for (const member of members) {
      if (!member.publicKey) continue;
      try {
        const encryptedPayload = await encryptForRecipient(text, member.publicKey);
        encryptedPayloads.push({
          recipient: member._id,
          payload: encryptedPayload,
        });
      } catch (error) {
        console.warn("Skipping member without a valid E2EE key:", member._id);
      }
    }

    if (!encryptedPayloads.length) {
      console.error("No group member has an E2EE public key.");
      return;
    }

    const payload = {
      groupId,
      sender: userId,
      text: "",
      encryptedPayloads,
      replyTo: replyingTo?._id || null,
    };

    socket.emit("send_group_message", payload);

    try {
      await API.post(`/messages/group/${groupId}`, payload);
    } catch (err) {
      console.error("Error sending message:", err);
    }

    setText("");
    setReplyingTo(null);
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await API.post(`/messages/${messageId}/reaction`, { emoji });
      setMessages((prev) => prev.map((msg) =>
        String(msg._id) === String(messageId)
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []).filter((r) => String(r.user) !== String(userId)),
                { user: userId, emoji },
              ],
            }
          : msg
      ));
      socket.emit("message_reaction", { groupId, messageId, userId, emoji });
    } catch (error) {
      console.error("Reaction error:", error);
    }
    setReactionPicker(null);
  };

  const markRead = async (messageId) => {
    if (!messageId || !userId) return;
    try {
      await API.patch(`/messages/${messageId}/read`);
      socket.emit("message_read", { groupId, messageId, userId });
    } catch (error) {
      console.warn("Read receipt error:", error);
    }
  };

  const replyToMessage = (message) => {
    setReplyingTo(message);
    setContextMessage(null);
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
              {typingUsers.length
                ? "typing..."
                : onlineUsers.size
                  ? `${onlineUsers.size} online`
                  : `${selectedGroup?.members?.length || 0} members`}
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
        {loadError && (
          <div className="chat-load-error">
            <strong>Couldn&apos;t load messages</strong>
            <span>{loadError}</span>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        {loading ? (
          <p className="loading">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="no-msg">No messages yet</p>
        ) : (
          messages.map((msg, i) => {
            const mine = String(msg.sender) === String(userId);
            const reactions = msg.reactions || [];
            return (
              <div
                key={msg._id || i}
                className={`message-shell ${mine ? "mine" : "theirs"}`}
                onMouseEnter={() => markRead(msg._id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMessage(msg);
                }}
              >
                <div className={mine ? "my-message" : "their-message"}>
                  {msg.replyTo?.text && (
                    <div className="reply-preview">
                      <strong>Reply</strong>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}
                  {msg.file ? (
                    msg.fileType?.startsWith("video") ? (
                      <video src={msg.file} className="chat-media" muted onClick={() => handleOpenVideo(msg.file)} />
                    ) : (
                      <img src={msg.file} className="chat-media" alt="" />
                    )
                  ) : (
                    <span>{msg.text}</span>
                  )}
                  <div className="message-meta">
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {mine && <span className={msg.readBy?.length > 1 ? "seen" : ""}>{msg.readBy?.length > 1 ? "✓✓" : "✓"}</span>}
                  </div>
                </div>
                <div className="message-actions">
                  <button onClick={() => setReactionPicker(reactionPicker === msg._id ? null : msg._id)}>☺</button>
                  <button onClick={() => replyToMessage(msg)}>↩</button>
                </div>
                {reactionPicker === msg._id && (
                  <div className="reaction-picker">
                    {["❤️","😂","👍","🔥","😮","👏"].map((emoji) => (
                      <button key={emoji} onClick={() => addReaction(msg._id, emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
                {reactions.length > 0 && (
                  <div className="reaction-list">
                    {reactions.map((reaction, index) => <span key={index}>{reaction.emoji}</span>)}
                  </div>
                )}
                {contextMessage?._id === msg._id && (
                  <div className="message-context">
                    <button onClick={() => replyToMessage(msg)}>Reply</button>
                    <button onClick={() => navigator.clipboard?.writeText(msg.text || "")}>Copy</button>
                    <button onClick={() => setContextMessage(null)}>Close</button>
                  </div>
                )}
              </div>
            );
          })
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

      {replyingTo && (
        <div className="reply-composer">
          <div><strong>Replying to</strong><span>{replyingTo.text || "Media message"}</span></div>
          <button onClick={() => setReplyingTo(null)}>×</button>
        </div>
      )}

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
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatPage;
