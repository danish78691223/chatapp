// server/src/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for private chats
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // for group chats
  text: { type: String, default: "" }, // legacy plaintext; new E2EE messages use encryptedPayload
  encryptedPayloads: [{
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payload: { type: Object },
  }],
  encryptedPayload: {
    ciphertext: { type: String },
    iv: { type: String },
    salt: { type: String },
    senderPublicKey: { type: Object },
    e2eeVersion: { type: Number },
  },
  file: { type: String, default: null },      // optional file URL (image / video)
  fileType: { type: String, default: null },  // MIME type for media
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: { type: String, maxlength: 8 } }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
