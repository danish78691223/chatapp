import User from "../models/User.js";

/**
 * POST /api/download/request
 * Body: { videoUrl }
 * Rules:
 *  - Gold: unlimited downloads
 *  - Others: 1 download per 24 hours
 */
export const requestDownload = async (req, res) => {
  try {
    const userId = req.user._id;
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ message: "Video URL is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.subscription?.plan || "free";

    // Gold => unlimited
    if (plan !== "gold") {
      const last = user.lastDownloadAt;
      if (last) {
        const diffMs = Date.now() - last.getTime();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (diffMs < TWENTY_FOUR_HOURS) {
          return res.status(403).json({
            message: "You have already downloaded a video in the last 24 hours.",
            code: "DOWNLOAD_LIMIT",
          });
        }
      }
    }

    // Allowed → save download record
    const now = new Date();
    user.lastDownloadAt = now;
    user.downloads.push({
      videoUrl,
      downloadedAt: now,
    });

    await user.save();

    return res.json({
      success: true,
      message: "Download allowed",
    });
  } catch (err) {
    console.error("Download request error:", err);
    res.status(500).json({ message: "Failed to process download request" });
  }
};

/**
 * GET /api/download/my
 * Returns all videos user has downloaded
 */
export const getMyDownloads = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("downloads");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      downloads: user.downloads || [],
    });
  } catch (err) {
    console.error("Get downloads error:", err);
    res.status(500).json({ message: "Failed to fetch downloads" });
  }
};
