// server/src/controllers/groupController.js
import Group from "../models/Group.js";
import User from "../models/User.js";

/* GET ALL GROUPS */
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("creator", "name email phone")
      .populate("members", "name email phone");
    res.status(200).json(groups);
  } catch (err) {
    console.error("❌ [Group Error] Fetching all:", err.message);
    res.status(500).json({ message: "Server error while fetching groups" });
  }
};

/* CREATE GROUP (protected) */
export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const creatorId = req.userId;

    if (!name) return res.status(400).json({ message: "Group name is required" });
    if (!creatorId) return res.status(401).json({ message: "Authentication required" });

    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ message: "Group name already exists" });

    const newGroup = new Group({
      name,
      creator: creatorId,
      members: [creatorId],
    });

    await newGroup.save();

    const populated = await Group.findById(newGroup._id)
      .populate("creator", "name email phone")
      .populate("members", "name email phone");

    res.status(201).json({ message: "Group created successfully", group: populated });
  } catch (err) {
    console.error("❌ [Group Error] Creating:", err);
    res.status(500).json({ message: "Server error creating group" });
  }
};

/* USER JOIN GROUP */
export const joinGroup = async (req, res) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;

    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.members.map(String).includes(String(userId))) {
      return res.status(400).json({ message: "Already a member" });
    }

    group.members.push(userId);
    await group.save();
    await group.populate("members", "name email phone");

    res.status(200).json({ message: "Joined group", group });
  } catch (err) {
    console.error("❌ [Group Error] User join:", err.message);
    res.status(500).json({ message: "Error joining group" });
  }
};

/* ADD MEMBER (admin) */
export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { groupId } = req.params;

    if (!userId) return res.status(400).json({ message: "userId is required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.members.map(String).includes(String(userId))) {
      return res.status(400).json({ message: "User already in group" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    group.members.push(userId);
    await group.save();
    await group.populate("members", "name email phone");

    res.status(200).json({ message: "Member added successfully", group });
  } catch (err) {
    console.error("❌ [Group Error] Adding member:", err.message);
    res.status(500).json({ message: "Error adding member" });
  }
};

/* GET USER'S GROUPS */
export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await Group.find({ members: userId })
      .populate("creator", "name email phone")
      .populate("members", "name email phone");
    res.status(200).json(groups);
  } catch (err) {
    console.error("❌ [Group Error] Fetching user groups:", err.message);
    res.status(500).json({ message: "Error fetching user groups" });
  }
};
