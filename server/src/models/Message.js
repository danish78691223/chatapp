// server/src/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for private chats
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // for group chats
  text: { type: String, default: "" }, // legacy plaintext; new E2EE messages use encryptedPayload\n  encryptedPayloads: [{\n    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },\n    payload: { type: Object },\n  }],\n  encryptedPayload: {\n    ciphertext: { type: String },\n    iv: { type: String },\n    salt: { type: String },\n    senderPublicKey: { type: Object },\n    e2eeVersion: { type: Number },\n  },
  file: { type: String, default: null },      // optional file URL (image / video)
  fileType: { type: String, default: null },  // MIME type for media
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", messageSchema);
