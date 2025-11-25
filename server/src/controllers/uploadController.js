// server/src/controllers/uploadController.js
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const localPath = req.file.path;

    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
    });

    // ✅ Delete local temp file after uploading
    fs.unlinkSync(localPath);

    return res.json({
      message: "Uploaded successfully",
      url: result.secure_url,
      type: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error });
  }
};
