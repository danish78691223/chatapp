import React, { useEffect, useState } from "react";
import API from "../api/axios";
import "./CommentSidebar.css";

const CommentSidebar = ({ videoUrl, onClose }) => {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetchComments();
  }, [videoUrl]);

  const fetchComments = async () => {
    const res = await API.get(`/comments/${encodeURIComponent(videoUrl)}`);
    setComments(res.data);
  };

  const addComment = async () => {
    if (!input.trim()) return;

    try {
      await API.post("/comments/add", { videoUrl, comment: input });
      setInput("");
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Invalid comment");
    }
  };

  const like = async (id) => {
    await API.post(`/comments/like/${id}`);
    fetchComments();
  };

  const dislike = async (id) => {
    await API.post(`/comments/dislike/${id}`);
    fetchComments();
  };

  // Fully working translation using LibreTranslate API
  const translate = async (text) => {
  let targetLang = prompt("Translate to (en, hi, fr, es, ar, etc):");
  if (!targetLang) return;

  try {
    const res = await API.post("/translate", {
      text,
      targetLang: targetLang.toLowerCase(),
    });

    alert("Translated:\n\n" + res.data.translated);
  } catch (error) {
    console.error("Translate Error:", error);
    alert("Translation failed");
  }
};



  return (
    <div className="comment-sidebar">
      <button className="close-comments" onClick={onClose}>✕</button>
      <h3>Comments</h3>

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="empty">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div key={c._id} className="comment-item">
              <p><strong>• {c.comment}</strong></p>
              <p className="city">📍 {c.city}</p>

              <div className="actions">
                <button onClick={() => like(c._id)}>👍 {c.likes}</button>
                <button onClick={() => dislike(c._id)}>👎 {c.dislikes}</button>
                <button onClick={() => translate(c.comment)}>🌐 Translate</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="comment-input-area">
        <input
          type="text"
          value={input}
          placeholder="Write a comment..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={addComment}>Send</button>
      </div>
    </div>
  );
};

export default CommentSidebar;
