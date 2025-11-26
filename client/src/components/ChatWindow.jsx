import React, { useEffect, useState, useRef } from "react";
import API from "../api/axios";

const ChatWindow = ({ groupId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const user = storedUser?.user || storedUser;

  // Load messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!groupId) return;
      try {
        const res = await API.get(`/messages/group/${groupId}`);
        setMessages(res.data);
      } catch (err) {
        console.error("❌ Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    try {
      await API.post(`/messages/group/${groupId}`, {
        sender: user?._id,
        text,
      });

      const res = await API.get(`/messages/group/${groupId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("❌ Error sending:", err);
    }
  };

  return (
    <div className="main-chat-window">
      <div className="msg-list">
        {loading ? (
          <p>Loading...</p>
        ) : messages.length ? (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} currentUserId={user?._id} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p>No messages yet</p>
        )}
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
