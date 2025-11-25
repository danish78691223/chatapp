// server/src/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for private chats
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // for group chats
  text: { type: String, default: "" },
  file: { type: String, default: null },      // optional file URL (image / video)
  fileType: { type: String, default: null },  // MIME type for media
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
