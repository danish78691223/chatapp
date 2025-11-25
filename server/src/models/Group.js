// server/src/models/Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Group creator is required"],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// prevent duplicate members
groupSchema.pre("save", function (next) {
  if (this.members && this.members.length > 0) {
    this.members = [...new Set(this.members.map((id) => id.toString()))];
  }
  next();
});

// ensure creator is included in members
groupSchema.pre("save", function (next) {
  if (this.creator && !this.members.includes(this.creator)) {
    this.members.push(this.creator);
  }
  next();
});

const Group = mongoose.model("Group", groupSchema);
export default Group;
