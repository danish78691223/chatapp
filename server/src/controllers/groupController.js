// server/src/controllers/groupController.js
import Group from "../models/Group.js";
import User from "../models/User.js";

const userFields = "name email phone publicKey e2eeVersion";
const populateGroup = (query) =>
  query.populate("creator", userFields)
    .populate("members", userFields)
    .populate("admins", userFields)
    .populate("joinRequests.user", userFields);

/* GET ALL GROUPS */
export const getAllGroups = async (req, res) => {
  try {
    const groups = await populateGroup(Group.find());
    res.status(200).json(groups);
  } catch (err) {
    console.error("❌ [Group Error] Fetching all:", err.message);
    res.status(500).json({ message: "Server error while fetching groups" });
  }
};

/* CREATE GROUP — creator is automatically admin */
export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const creatorId = req.userId;

    if (!name) return res.status(400).json({ message: "Group name is required" });
    if (!creatorId) return res.status(401).json({ message: "Authentication required" });

    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ message: "Group name already exists" });

    const newGroup = await Group.create({
      name,
      creator: creatorId,
      members: [creatorId],
      admins: [creatorId],
      joinRequests: [],
    });

    const populated = await populateGroup(Group.findById(newGroup._id));
    res.status(201).json({ message: "Group created successfully", group: populated });
  } catch (err) {
    console.error("❌ [Group Error] Creating:", err);
    res.status(500).json({ message: "Server error creating group" });
  }
};

/* REQUEST TO JOIN GROUP */
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

    const existingRequest = group.joinRequests.find(
      (r) => String(r.user) === String(userId) && r.status === "pending"
    );
    if (existingRequest) {
      return res.status(200).json({ message: "Join request is already pending", status: "pending" });
    }

    group.joinRequests.push({ user: userId, status: "pending" });
    await group.save();

    res.status(200).json({
      message: "Join request sent. An admin must approve your request.",
      status: "pending",
    });
  } catch (err) {
    console.error("❌ [Group Error] Join request:", err.message);
    res.status(500).json({ message: "Error sending join request" });
  }
};

const ensureAdmin = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) return { error: { status: 404, message: "Group not found" } };

  const isAdmin =
    group.admins.map(String).includes(String(userId)) ||
    String(group.creator) === String(userId);

  if (!isAdmin) return { error: { status: 403, message: "Only group admins can perform this action" } };
  return { group };
};

/* GET PENDING JOIN REQUESTS — admin only */
export const getJoinRequests = async (req, res) => {
  try {
    const result = await ensureAdmin(req.params.groupId, req.userId);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });

    const group = await populateGroup(Group.findById(req.params.groupId));
    res.status(200).json(group.joinRequests.filter((r) => r.status === "pending"));
  } catch (err) {
    console.error("❌ [Group Error] Fetching join requests:", err.message);
    res.status(500).json({ message: "Error fetching join requests" });
  }
};

/* APPROVE / REJECT JOIN REQUEST — admin only */
export const respondToJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }

    const result = await ensureAdmin(groupId, req.userId);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });

    const group = result.group;
    const request = group.joinRequests.id(requestId);

    if (!request) return res.status(404).json({ message: "Join request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: `Request already ${request.status}` });

    request.status = action === "approve" ? "approved" : "rejected";
    request.respondedAt = new Date();

    if (action === "approve" && !group.members.map(String).includes(String(request.user))) {
      group.members.push(request.user);
    }

    await group.save();
    res.status(200).json({
      message: action === "approve" ? "User approved and added to the group" : "Join request rejected",
      status: request.status,
    });
  } catch (err) {
    console.error("❌ [Group Error] Responding to join request:", err.message);
    res.status(500).json({ message: "Error processing join request" });
  }
};

/* ADD MEMBER — admin only */
export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { groupId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const result = await ensureAdmin(groupId, req.userId);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });

    const group = result.group;
    if (group.members.map(String).includes(String(userId))) {
      return res.status(400).json({ message: "User already in group" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    group.members.push(userId);
    await group.save();
    const populated = await populateGroup(Group.findById(group._id));
    res.status(200).json({ message: "Member added successfully", group: populated });
  } catch (err) {
    console.error("❌ [Group Error] Adding member:", err.message);
    res.status(500).json({ message: "Error adding member" });
  }
};

/* GET USER'S GROUPS */
export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await populateGroup(Group.find({ members: userId }));
    res.status(200).json(groups);
  } catch (err) {
    console.error("❌ [Group Error] Fetching user groups:", err.message);
    res.status(500).json({ message: "Error fetching user groups" });
  }
};
