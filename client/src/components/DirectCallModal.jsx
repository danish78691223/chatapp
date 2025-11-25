// src/components/DirectCallModal.jsx
import React from "react";
import VideoCall from "./VideoCall";
import "./CallModal.css"; // reuse same overlay/window styles

const DirectCallModal = ({ localUserId, targetUser, incomingOffer, isCaller, onClose }) => {
  if (!targetUser) return null;

  return (
    <div className="call-overlay">
      <div className="call-window">
        <button className="call-close-x" onClick={onClose}>
          ✕
        </button>

        <h3 style={{ marginBottom: "8px" }}>
          {isCaller ? "Calling" : "In call with"} {targetUser.name}
        </h3>

        <VideoCall
          localUserId={localUserId}
          remoteUserId={targetUser._id}
          isCaller={isCaller}
          initialOffer={incomingOffer}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default DirectCallModal;
