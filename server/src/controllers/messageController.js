// server/src/controllers/messageController.js
import Message from "../models/Message.js";
import Group from "../models/Group.js";

/* Send private message */
export const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, text, file, fileType } = req.body;

    const message = await Message.create({
      sender,
      receiver,
      text: text || "",
      file: file || null,
      fileType: fileType || null,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("🔥 Error sending message:", err);
    res.status(500).json({ message: err.message });
  }
};

/* Get private messages between two users */
export const getMessages = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("🔥 Error fetching messages:", error);
    res.status(500).json({ message: error.message });
  }
};

/* Get group messages */
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const messages = await Message.find({ groupId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error("🔥 Error fetching group messages:", err);
    res.status(500).json({ message: err.message });
  }
};

/* Send group message (plain text or file) */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { sender, text, file, fileType } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.map(id => id.toString()).includes(String(sender));
    if (!isMember) {
      return res.status(403).json({ message: "Join group to send messages" });
    }

    const message = await Message.create({
      sender,
      groupId,
      text: text || "",
      file: file || null,
      fileType: fileType || null,
    });

    // update lastMessage for UI convenience
    group.lastMessage = text ? text : (file ? "[Media]" : "");
    await group.save();

    res.status(201).json(message);
  } catch (err) {
    console.error("🔥 Error sending group message:", err);
    res.status(500).json({ message: err.message });
  }
};
