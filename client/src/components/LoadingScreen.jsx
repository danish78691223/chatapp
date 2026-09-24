import { useEffect, useState } from "react";
import "./LoadingScreen.css";

const LoadingScreen = ({ onComplete }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setLeaving(true), 5700);
    const completeTimer = window.setTimeout(() => onComplete?.(), 6700);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`webchat-loader ${leaving ? "is-leaving" : ""}`} aria-label="Loading WEBCHAT">
      <div className="loader-glow" />
      <div className="loader-content">
        <img className="loader-logo" src="/webchat-logo.svg" alt="WEBCHAT" />
        <div className="loader-status"><span />SECURE REAL-TIME CHAT</div>
        <div className="loader-progress"><span /></div>
        <p>Connecting your private workspace…</p>
      </div>
      <div className="ocean">
        <div className="wave wave-back" />
        <div className="wave wave-mid" />
        <div className="wave wave-front" />
      </div>
      <div className="loader-sheen" />
    </div>
  );
};

export default LoadingScreen;
