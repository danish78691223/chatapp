// server/src/routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadMedia } from "../controllers/uploadController.js";

const router = express.Router();

// Temp storage (Multer saves only for Cloudinary upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ Upload Route → Cloudinary
router.post("/", upload.single("file"), uploadMedia);

// ✅ Static file streaming 
router.get("/:filename", (req, res) => {
  const videoPath = path.resolve("uploads", req.params.filename);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ message: "Video Not Found" });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    return fs.createReadStream(videoPath).pipe(res);
  }

  const chunkSize = 1 * 1024 * 1024;
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + chunkSize, fileSize - 1);

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "video/mp4",
  });

  fs.createReadStream(videoPath, { start, end }).pipe(res);
});

export default router;
