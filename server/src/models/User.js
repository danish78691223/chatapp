// server/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    publicKey: { type: Object }, // ✅ store user’s RSA public key (JWK)

    // ✅ Subscription Details
    subscription: {
      plan: {
        type: String,
        enum: ["free", "bronze", "silver", "gold"],
        default: "free",
      },
      watchLimitMinutes: {
        type: mongoose.Schema.Types.Mixed, // number OR "unlimited"
        default: 5,                         // free plan 5 minutes
      },
      minutesWatchedToday: {
        type: Number,
        default: 0, // we store SECONDS here in watchRoutes
      },
      lastWatchedDate: {
        type: Date,
      },
    },

    // ✅ Download related fields
    lastDownloadAt: {
      type: Date, // used to enforce "1 per 24 hours" for non-gold users
    },
    downloads: [
      {
        videoUrl: { type: String, required: true },
        downloadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
