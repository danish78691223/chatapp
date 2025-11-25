import React, { useState } from "react";

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState("");

  const handleSendClick = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="chat-input-row">
      <input
        type="text"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="msg-input"
      />
      <button onClick={handleSendClick} className="msg-send-btn">
        Send
      </button>
    </div>
  );
};

export default ChatInput;
