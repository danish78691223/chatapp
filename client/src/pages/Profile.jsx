// client/src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();

  const stored = JSON.parse(localStorage.getItem("user"));
  const user = stored?.user || stored;

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const [downloads, setDownloads] = useState([]);

  const handleSave = async () => {
    if (!name.trim()) return alert("Name cannot be empty");
    if (!phone.trim()) return alert("Phone cannot be empty");

    try {
      setLoading(true);
      const res = await API.put(`/auth/update`, { name, phone });
      localStorage.setItem("user", JSON.stringify(res.data));
      alert("✅ Profile Updated Successfully!");
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  // Fetch downloaded videos
  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const res = await API.get("/download/my");
        setDownloads(res.data.downloads || []);
      } catch (err) {
        console.error("Error fetching downloads:", err);
      }
    };

    fetchDownloads();
  }, []);

  return (
    <div className="profile-wrapper">
      <div className="profile-left">
        <div className="profile-avatar">👤</div>

        <div className="profile-item">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="profile-item">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="profile-item">
          <label>Email</label>
          <input value={email} disabled />
        </div>

        <button onClick={handleSave} disabled={loading} className="save-btn">
          {loading ? "Updating..." : "Save Changes"}
        </button>

        <button className="back-btn" onClick={() => navigate("/home")}>
          ← Back
        </button>
      </div>

      <div className="profile-right">
        <h2>Downloads</h2>

        {downloads.length === 0 ? (
          <p>No videos downloaded yet.</p>
        ) : (
          <div className="downloads-list">
            {downloads.map((d, i) => (
              <div
                key={i}
                className="download-item"
                onClick={() =>
                  navigate("/player", { state: { url: d.videoUrl } })
                }
              >
                <img
                  src={d.thumbnail || "/video-thumb.png"}
                  className="download-thumb"
                  alt="thumbnail"
                />

                <div className="download-info">
                  <p className="download-name">Downloaded Video {i + 1}</p>
                  <p className="download-date">
                    {new Date(d.downloadedAt).toLocaleString()}
                  </p>
                </div>

                <button className="play-btn">▶</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
