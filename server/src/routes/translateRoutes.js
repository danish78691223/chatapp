import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(url);
    const data = await response.json();

    // Google returns nested array — extract translation
    const translated = data?.[0]?.[0]?.[0];

    if (!translated) {
      return res.status(400).json({ message: "Translation failed" });
    }

    res.json({ translated });

  } catch (error) {
    console.error("🔥 Translation Server Error:", error);
    res.status(500).json({ message: "Translation failed" });
  }
});

export default router;
