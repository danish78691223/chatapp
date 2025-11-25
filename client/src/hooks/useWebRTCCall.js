// src/hooks/useWebRTCCall.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const pcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const useWebRTCCall = (currentUserId, remoteUserId) => {
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());

  const screenStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // ---------------- SOCKET + SIGNALING ----------------
  useEffect(() => {
    if (!currentUserId) return;

    const socket = io("http://localhost:5000"); // your backend
    socketRef.current = socket;

    // register user on socket server
    socket.emit("register-user", currentUserId);

    socket.on("incoming-call", ({ fromUserId, offer }) => {
      // only accept if it's the user we expect OR allow anyone
      setIncomingCall({ fromUserId, offer });
    });

    socket.on("call-answered", async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    socket.on("call-ended", () => {
      endCall();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(pcConfig);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit("ice-candidate", {
          toUserId: remoteUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => {
        remoteStreamRef.current.addTrack(t);
      });
    };

    pcRef.current = pc;
    return pc;
  };

  // ---------------- START CALL (1-ON-1) ----------------
  const startCall = async () => {
    if (!remoteUserId) {
      alert("No user selected to call.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit("call-user", {
      toUserId: remoteUserId,
      offer,
    });

    setInCall(true);
  };

  // ---------------- ACCEPT CALL ----------------
  const acceptCall = async () => {
    if (!incomingCall) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(incomingCall.offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit("answer-call", {
      toUserId: incomingCall.fromUserId,
      answer,
    });

    setIncomingCall(null);
    setInCall(true);
  };

  // ---------------- END CALL ----------------
  const endCall = () => {
    // stop recording if active
    if (isRecording) {
      stopRecording();
    }

    pcRef.current?.getSenders().forEach((s) => s.track && s.track.stop());
    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    remoteStreamRef.current = new MediaStream();

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setInCall(false);
    setIncomingCall(null);
  };

  const hangUp = () => {
    socketRef.current?.emit("end-call", { toUserId: remoteUserId });
    endCall();
  };

  // ---------------- SCREEN SHARE ----------------
  const startScreenShare = async () => {
    if (!pcRef.current) return;

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    screenStreamRef.current = screenStream;

    const screenTrack = screenStream.getVideoTracks()[0];

    const sender = pcRef.current
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");

    if (sender && screenTrack) {
      await sender.replaceTrack(screenTrack);
    }

    // when user stops sharing from browser UI
    screenTrack.onended = () => {
      stopScreenShare();
    };
  };

  const stopScreenShare = async () => {
    if (!pcRef.current) return;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // revert back to camera video track
    const camTrack = localStreamRef.current
      ?.getVideoTracks()[0];

    const sender = pcRef.current
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");

    if (sender && camTrack) {
      await sender.replaceTrack(camTrack);
    }
  };

  // ---------------- RECORDING ----------------
  const startRecording = () => {
    if (!remoteStreamRef.current || remoteStreamRef.current.getTracks().length === 0) {
      alert("No remote stream to record yet.");
      return;
    }

    const streamToRecord = remoteStreamRef.current;
    const recorder = new MediaRecorder(streamToRecord, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      recordedChunksRef.current = [];

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  return {
    inCall,
    incomingCall,
    startCall,
    acceptCall,
    hangUp,
    endCall,
    localStreamRef,
    remoteStreamRef,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    isRecording,
  };
};
