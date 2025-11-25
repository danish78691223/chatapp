const MessageBubble = ({ message, currentUserId }) => {
  const isMine = message.sender === currentUserId;

  return (
    <div
      className={`msg-bubble ${isMine ? "mine" : ""}`}
      style={{ alignSelf: isMine ? "flex-end" : "flex-start" }}
    >
      <div className="msg-text">{message.text}</div>
      <div className="msg-meta">{isMine ? "You" : message.senderName} • {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
    </div>
  );
};

export default MessageBubble;
