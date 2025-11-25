import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

const ChatWindow = ({ groupId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // ✅ Safely parse user and token
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const user = storedUser?.user || storedUser;
  const token = storedUser?.token;

  // ✅ Fetch messages from backend
  useEffect(() => {
    const fetchMessages = async () => {
      if (!groupId) return;
      try {
        const res = await axios.get(
          `http://localhost:5000/api/messages/group/${groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(res.data);
      } catch (err) {
        console.error("❌ Error fetching messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId, token]);

  // ✅ Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send new message
  const handleSend = async (text) => {
    if (!text.trim()) return;
    try {
      await axios.post(
        `http://localhost:5000/api/messages/group/${groupId}`,
        { sender: user?._id, text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh messages
      const res = await axios.get(
        `http://localhost:5000/api/messages/group/${groupId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(res.data);
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  return (
    <div className="main-chat-window">
      <div className="msg-list">
        {loading ? (
          <p>Loading...</p>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                currentUserId={user?._id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p style={{ color: "#888" }}>No messages yet</p>
        )}
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
