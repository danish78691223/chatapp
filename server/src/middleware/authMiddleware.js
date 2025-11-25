// server/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware to protect private routes.
 * Checks for JWT in Authorization header and attaches user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  try {
    // ✅ Check if Authorization header exists and starts with Bearer
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1]; // Extract token

      // ✅ Verify token using secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Attach user to request (excluding password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        console.warn("⚠️ User not found for token");
        return res.status(401).json({ message: "User not found" });
      }

      // ✅ Attach convenience ID
      req.userId = req.user._id;

      next();
    } else {
      console.warn("❌ No token provided");
      return res.status(401).json({ message: "No token provided" });
    }
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * Optional middleware to check admin privileges.
 * You can attach this to admin-only routes if needed.
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Access denied: Admins only" });
  }
};
