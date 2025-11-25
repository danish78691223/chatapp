import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../api/axios";
import "./VideoPlayer.css";

const VideoPlayer = ({ url, onClose, onNext, onShowComments }) => {
  const videoRef = useRef(null);

  const [limit, setLimit] = useState(null);          // watch limit minutes
  const [watched, setWatched] = useState(0);         // seconds watched
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const stored = JSON.parse(localStorage.getItem("user"));
  const userId = stored?.user?._id || stored?._id;
  const location = useLocation();
  const urlFromState = location.state?.url;
  const videoSource = urlFromState || url;   // fallback for old code


  // 1️⃣ FETCH PLAN FROM BACKEND
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await API.get(`/payment/plan/${userId}`);
        setLimit(res.data.limit);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching plan:", error);
      }
    };

    if (userId) fetchPlan();
  }, [userId]);

  // 2️⃣ TRACK WATCH TIME EVERY SECOND
  useEffect(() => {
    if (loading || !limit || limitReached) return;

    const timer = setInterval(async () => {
      setWatched((prev) => prev + 1); // local

      try {
        await API.post("/watch/track", { watchedSeconds: 1 });
      } catch (err) {
        if (err.response?.status === 403) {
          setLimitReached(true);
          videoRef.current?.pause();
          alert("⛔ Your daily watch limit is over.");
          window.location.href = "/subscription";
        }
      }

      // Local fallback
      if (limit !== "unlimited" && watched >= limit * 60) {
        setLimitReached(true);
        videoRef.current?.pause();
        alert(`Your daily watch limit of ${limit} minutes is over.`);
        window.location.href = "/subscription";
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [limit, watched, loading, limitReached]);

  // 3️⃣ GESTURE CONTROL
  const tapRef = useRef({
    lastTapTime: 0,
    taps: 0,
    timeoutId: null,
    lastX: null,
  });

  const [gesture, setGesture] = useState("");

  const showGesture = (type) => {
    setGesture(type);
    setTimeout(() => setGesture(""), 400);
  };

  const handlePointer = (clientX) => {
    const video = videoRef.current;
    if (!video) return;

    const width = window.innerWidth;
    const now = Date.now();

    if (now - tapRef.current.lastTapTime > 300) {
      tapRef.current.taps = 0;
    }

    tapRef.current.taps++;
    tapRef.current.lastTapTime = now;
    tapRef.current.lastX = clientX;

    if (tapRef.current.timeoutId) clearTimeout(tapRef.current.timeoutId);

    tapRef.current.timeoutId = setTimeout(() => {
      const taps = tapRef.current.taps;
      const x = tapRef.current.lastX;

      tapRef.current.taps = 0;

      // Single tap
      if (taps === 1) {
        if (video.paused) {
          video.play().catch(() => {});
          showGesture("play");
        } else {
          video.pause();
          showGesture("pause");
        }
        return;
      }

      // Double tap skip
      if (taps === 2) {
        if (x < width * 0.33) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          showGesture("backward");
        } else if (x > width * 0.66) {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          showGesture("forward");
        } else {
          video.paused ? video.play().catch(() => {}) : video.pause();
        }
        return;
      }

      // Triple tap
      if (taps >= 3) {
        if (x < width * 0.33) onShowComments?.();
        else if (x > width * 0.66) onClose?.();
        else onNext?.();
      }
    }, 220);
  };

  const handlePointerDown = (e) => {
    if (typeof e.clientX === "number") handlePointer(e.clientX);
  };

  // 4️⃣ DOWNLOAD HANDLER (1 per 24h unless GOLD)
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      await API.post("/download/request", { videoUrl: url });

      // Trigger browser download
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 403) {
        alert(msg || "Free download limit reached. Upgrade to GOLD for unlimited downloads.");
        if (window.confirm("Go to Subscription page to upgrade to GOLD plan?")) {
          window.location.href = "/subscription";
        }
      } else {
        console.error("Download error:", err);
        alert("Failed to start download. Try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  // 5️⃣ RENDER
  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="video-modal">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={videoSource}
          autoPlay
          playsInline
          className="video-player"
          onPointerDown={handlePointerDown}
        />

        {/* Close / Comments */}
        <button className="close-btn" onClick={onClose}>✕</button>
        <button className="comment-btn" onClick={onShowComments}>💬 Comments</button>

        {/* NEW: Download button */}
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Downloading..." : "⬇ Download"}
        </button>

        {/* Gesture feedback */}
        {gesture === "forward" && <div className="gesture forward">⏩ +10s</div>}
        {gesture === "backward" && <div className="gesture backward">⏪ -10s</div>}
        {gesture === "pause" && <div className="gesture center">⏸</div>}
        {gesture === "play" && <div className="gesture center">▶</div>}
      </div>
    </div>
  );
};

export default VideoPlayer;
