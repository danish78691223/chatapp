// server/src/models/Group.js
import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
  },
  { _id: true }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Group name is required"], trim: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "Group creator is required"] },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    joinRequests: [joinRequestSchema],
    lastMessage: { type: String, default: "🔐 Encrypted message", trim: true },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

groupSchema.pre("save", function (next) {
  if (this.members) this.members = [...new Set(this.members.map((id) => id.toString()))];
  if (this.admins) this.admins = [...new Set(this.admins.map((id) => id.toString()))];

  if (this.creator) {
    if (!this.members.map(String).includes(String(this.creator))) this.members.push(this.creator);
    if (!this.admins.map(String).includes(String(this.creator))) this.admins.push(this.creator);
  }
  next();
});

const Group = mongoose.model("Group", groupSchema);
export default Group;
