// src/components/VideoCall.jsx
import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";
import "./VideoCall.css";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VideoCall = ({ localUserId, remoteUserId, isCaller, initialOffer, onClose }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [inCall, setInCall] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // =============================
  // 1. Create Peer Connection
  // =============================
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    return pc;
  };

  // =============================
  // 2. Init call (caller/callee)
  // =============================
  useEffect(() => {
    const start = async () => {
      try {
        pcRef.current = createPeerConnection();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, stream);
        });

        if (isCaller) {
          // Caller: create offer
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);

          socket.emit("call-user", {
            toUserId: remoteUserId,
            offer,
          });
        } else if (initialOffer) {
          // Callee: use incoming offer
          await pcRef.current.setRemoteDescription(initialOffer);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);

          socket.emit("answer-call", {
            toUserId: remoteUserId,
            answer,
          });
        }

        setInCall(true);
      } catch (err) {
        console.error("Error starting call:", err);
        onClose();
      }
    };

    start();

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =============================
  // 3. Socket listeners
  // =============================
  useEffect(() => {
    const handleAnswered = async ({ answer }) => {
      if (!isCaller) return; // only caller needs this
      try {
        await pcRef.current.setRemoteDescription(answer);
      } catch (err) {
        console.error("Error setting remote desc:", err);
      }
    };

    const handleCandidate = async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ice candidate:", err);
      }
    };

    const handleEnded = () => {
      cleanup();
      onClose();
    };

    socket.on("call-answered", handleAnswered);
    socket.on("ice-candidate", handleCandidate);
    socket.on("call-ended", handleEnded);

    return () => {
      socket.off("call-answered", handleAnswered);
      socket.off("ice-candidate", handleCandidate);
      socket.off("call-ended", handleEnded);
    };
  }, [isCaller, onClose, remoteUserId]);

  // =============================
  // 4. Cleanup
  // =============================
  const cleanup = () => {
    try {
      if (recorderRef.current && recording) {
        recorderRef.current.stop();
      }
    } catch (_) {}

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    setInCall(false);
    setRecording(false);
  };

  const endCall = () => {
    socket.emit("end-call", { toUserId: remoteUserId });
    cleanup();
    onClose();
  };

  // =============================
  // 5. Screen Share (YouTube tab)
  // =============================
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // share tab audio (e.g., YouTube) if browser allows
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && screenTrack) {
        await sender.replaceTrack(screenTrack);
        localVideoRef.current.srcObject = screenStream;
      }

      screenTrack.onended = () => {
        if (!localStreamRef.current) return;
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        if (camTrack && sender) {
          sender.replaceTrack(camTrack);
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      };
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  // =============================
  // 6. Recording (local download)
  // =============================
  const startRecording = () => {
    if (!remoteStreamRef.current && !localStreamRef.current) {
      alert("Call not connected yet.");
      return;
    }

    const mixed = new MediaStream();

    // Remote video + audio
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => mixed.addTrack(t));
    }

    // Local audio (mic)
    if (localStreamRef.current) {
      localStreamRef.current
        .getAudioTracks()
        .forEach((t) => mixed.addTrack(t));
    }

    const recorder = new MediaRecorder(mixed, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    recorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div className="video-call-wrapper">
      <div className="video-area">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="remote-video"
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="local-video"
        />
      </div>

      <div className="video-controls">
        {inCall && (
          <>
            <button onClick={startScreenShare}>Share Screen (YouTube tab)</button>
            {!recording ? (
              <button onClick={startRecording}>Start Recording</button>
            ) : (
              <button onClick={stopRecording}>Stop Recording</button>
            )}
            <button onClick={endCall}>End Call</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
