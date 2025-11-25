// src/components/CallModal.jsx
import React from "react";
import GroupCallRoom from "./GroupCallRoom";
import "./CallModal.css";

const CallModal = ({ roomName, userId, onClose }) => {
  if (!roomName) return null;

  return (
    <div className="call-overlay">
      <div className="call-window">
        <button className="call-close-x" onClick={onClose}>
          ✕
        </button>

        <GroupCallRoom
          roomName={roomName}
          userId={userId}
          onDisconnect={onClose}
        />
      </div>
    </div>
  );
};

export default CallModal;
