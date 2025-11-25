// src/components/GroupCallRoom.jsx
import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";
import "./VideoCall.css"; // reuse styles

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const GroupCallRoom = ({ roomName, userId, onDisconnect }) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // remoteUserId -> RTCPeerConnection
  const peersRef = useRef({});
  // remoteUserId -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState({});

  const [joined, setJoined] = useState(false);

  // ------------------------------
  // Helper: create RTCPeerConnection per peer
  // ------------------------------
  const createPeerConnection = (remoteUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Local ICE candidates -> send to remote
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("group-ice-candidate", {
          roomId: roomName,
          toUserId: remoteUserId,
          fromUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    // Remote media -> add to remote stream map
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const existing = prev[remoteUserId] || new MediaStream();
        event.streams[0].getTracks().forEach((t) => {
          existing.addTrack(t);
        });
        return { ...prev, [remoteUserId]: existing };
      });
    };

    // Attach our local tracks to this pc
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peersRef.current[remoteUserId] = pc;
    return pc;
  };

  // ------------------------------
  // Start: getUserMedia + join-call-room
  // ------------------------------
  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit("join-call-room", {
          roomId: roomName,
          userId,
        });

        setJoined(true);
      } catch (err) {
        console.error("Error starting group call:", err);
        onDisconnect();
      }
    };

    start();

    return () => {
      // on unmount
      cleanup();
      socket.emit("leave-call-room", {
        roomId: roomName,
        userId,
      });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, userId]);

  // ------------------------------
  // Socket listeners for group WebRTC
  // ------------------------------
  useEffect(() => {
    if (!joined) return;

    // 1. When we join, server sends list of existing users
    const handleRoomUsers = async ({ roomId, users }) => {
      if (roomId !== roomName) return;

      for (const otherId of users) {
        // We are the new user, we create offer to each existing user
        let pc = peersRef.current[otherId];
        if (!pc) pc = createPeerConnection(otherId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("group-call-offer", {
            roomId: roomName,
            toUserId: otherId,
            fromUserId: userId,
            offer,
          });
        } catch (err) {
          console.error("Error creating offer to", otherId, err);
        }
      }
    };

    // 2. When we receive offer from someone
    const handleOffer = async ({ roomId, fromUserId, offer }) => {
      if (roomId !== roomName) return;
      if (fromUserId === userId) return;

      let pc = peersRef.current[fromUserId];
      if (!pc) pc = createPeerConnection(fromUserId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("group-call-answer", {
          roomId: roomName,
          toUserId: fromUserId,
          fromUserId: userId,
          answer,
        });
      } catch (err) {
        console.error("Error handling offer from", fromUserId, err);
      }
    };

    // 3. When we receive answer to our offer
    const handleAnswer = async ({ roomId, fromUserId, answer }) => {
      if (roomId !== roomName) return;
      if (fromUserId === userId) return;

      const pc = peersRef.current[fromUserId];
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote desc (answer):", err);
      }
    };

    // 4. ICE candidates from other peers
    const handleCandidate = async ({ roomId, fromUserId, candidate }) => {
      if (roomId !== roomName) return;
      if (fromUserId === userId) return;

      const pc = peersRef.current[fromUserId];
      if (!pc) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    };

    // 5. Someone left room
    const handleUserLeft = ({ roomId, userId: remoteId }) => {
      if (roomId !== roomName) return;

      const pc = peersRef.current[remoteId];
      if (pc) {
        pc.close();
        delete peersRef.current[remoteId];
      }

      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[remoteId];
        return copy;
      });
    };

    socket.on("call-room-users", handleRoomUsers);
    socket.on("group-call-offer", handleOffer);
    socket.on("group-call-answer", handleAnswer);
    socket.on("group-ice-candidate", handleCandidate);
    socket.on("call-user-left-room", handleUserLeft);

    return () => {
      socket.off("call-room-users", handleRoomUsers);
      socket.off("group-call-offer", handleOffer);
      socket.off("group-call-answer", handleAnswer);
      socket.off("group-ice-candidate", handleCandidate);
      socket.off("call-user-left-room", handleUserLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, roomName, userId]);

  // ------------------------------
  // Cleanup
  // ------------------------------
  const cleanup = () => {
    // close all peer connections
    Object.values(peersRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch (_) {}
    });
    peersRef.current = {};

    // stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setRemoteStreams({});
  };

  const handleLeave = () => {
    socket.emit("leave-call-room", { roomId: roomName, userId });
    cleanup();
    onDisconnect();
  };

  return (
    <div className="video-call-wrapper">
      <div className="video-area">
        {/* remote grid */}
        <div className="remote-grid">
          {Object.entries(remoteStreams).map(([remoteId, stream]) => (
            <div key={remoteId} className="remote-item">
              <video
                className="remote-video"
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && stream && el.srcObject !== stream) {
                    el.srcObject = stream;
                  }
                }}
              />
              <div className="remote-label">{remoteId}</div>
            </div>
          ))}
        </div>

        {/* local video */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="local-video"
        />
      </div>

      <div className="video-controls">
        <button onClick={handleLeave}>Leave Call</button>
      </div>
    </div>
  );
};

export default GroupCallRoom;
