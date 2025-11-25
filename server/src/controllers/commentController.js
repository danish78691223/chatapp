import Comment from "../models/Comment.js";
import axios from "axios";

// Detect city using IP
const getCityFromIP = async () => {
  try {
    const res = await axios.get("https://ipapi.co/json/");
    return res.data.city || "Unknown";
  } catch {
    return "Unknown";
  }
};

// Validate comment (remove special characters)
const isValidComment = (text) => /^[A-Za-z0-9\s.,!?]+$/.test(text);

export const addComment = async (req, res) => {
  try {
    const { videoUrl, comment } = req.body;

    if (!isValidComment(comment)) {
      return res.status(400).json({ message: "Special characters not allowed" });
    }

    const city = await getCityFromIP();

    const newComment = await Comment.create({
      videoUrl,
      userId: req.user._id,
      comment,
      city,
    });

    res.json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment" });
  }
};

export const getComments = async (req, res) => {
  try {
    const { videoUrl } = req.params;
    const comments = await Comment.find({ videoUrl }).sort({ createdAt: -1 });
    res.json(comments);
  } catch {
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

export const likeComment = async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  comment.likes += 1;
  await comment.save();

  res.json(comment);
};

export const dislikeComment = async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  comment.dislikes += 1;

  if (comment.dislikes >= 2) {
    await comment.deleteOne();
    return res.json({ deleted: true });
  }

  await comment.save();
  res.json(comment);
};

export const translateComment = async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    const r = await axios.post(
      "https://libretranslate.de/translate",
      {
        q: text,
        target: targetLang,
        source: "auto"
      },
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({ translated: r.data.translatedText });
  } catch {
    res.status(500).json({ message: "Translate failed" });
  }
};
