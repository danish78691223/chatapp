import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";

// ROUTES
import authRoutes from "./src/routes/authRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import groupRoutes from "./src/routes/groupRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import watchRoutes from "./src/routes/watchRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import translateRoutes from "./src/routes/translateRoutes.js";
import downloadRoutes from "./src/routes/downloadRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// =====================================
// USER SOCKET STORE
// =====================================
const userSockets = {};
const callRooms = {};

// =====================================
// CORS MIDDLEWARE (UPDATED)
// =====================================
const allowedOrigins = [
  "http://localhost:3000",
  "https://chatapp-virid-three-86.vercel.app", // YOUR VERCEL DOMAIN
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// =====================================
// STATIC FILES
// =====================================
app.use("/uploads", express.static("uploads"));

// VIDEO STREAMING
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join("uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr);
    const end = endStr ? parseInt(endStr) : fileSize - 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// =====================================
// ROUTES
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/watch", watchRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/download", downloadRoutes);

// ROOT
app.get("/", (req, res) => res.send("🚀 ChatApp server running"));

// =====================================
// DATABASE
// =====================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// =====================================
// SOCKET.IO CONFIG (UPDATED)
// =====================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket Connected:", socket.id);

  // Register user for signaling
  socket.on("register-user", (userId) => {
    userSockets[userId] = socket.id;
    socket.userId = userId;
    console.log(`Registered: ${userId} -> ${socket.id}`);
  });

  // Group message events
  socket.on("join_group", (groupId) => socket.join(groupId));
  socket.on("leave_group", (groupId) => socket.leave(groupId));

  socket.on("send_group_message", (msg) => {
    io.to(msg.groupId).emit("receive_group_message", msg);
  });

  // Group Call Alert
  socket.on("start-group-call", ({ groupId, callerId, callerName }) => {
    socket.to(groupId).emit("incoming-group-call", {
      groupId,
      callerId,
      callerName,
    });
  });

  // WebRTC (1-on-1 Signaling)
  socket.on("call-user", ({ toUserId, offer }) => {
    const target = userSockets[toUserId];
    if (target) {
      io.to(target).emit("incoming-call", {
        fromUserId: socket.userId,
        offer,
      });
    }
  });

  socket.on("answer-call", ({ toUserId, answer }) => {
    const target = userSockets[toUserId];
    if (target) {
      io.to(target).emit("call-answered", { answer });
    }
  });

  socket.on("ice-candidate", ({ toUserId, candidate }) => {
    const target = userSockets[toUserId];
    if (target) {
      io.to(target).emit("ice-candidate", { candidate });
    }
  });

  // WebRTC (Group Mesh Call)
  socket.on("join-call-room", ({ roomId, userId }) => {
    if (!callRooms[roomId]) callRooms[roomId] = new Set();

    const existingUsers = Array.from(callRooms[roomId]);
    callRooms[roomId].add(userId);
    socket.join(roomId);

    socket.emit("call-room-users", { roomId, users: existingUsers });

    socket.to(roomId).emit("call-user-joined-room", { roomId, userId });
  });

  socket.on("leave-call-room", ({ roomId, userId }) => {
    socket.leave(roomId);

    if (callRooms[roomId]) {
      callRooms[roomId].delete(userId);

      if (callRooms[roomId].size === 0) delete callRooms[roomId];
    }

    socket.to(roomId).emit("call-user-left-room", { roomId, userId });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    let disconnectedUser = null;

    for (const uid in userSockets) {
      if (userSockets[uid] === socket.id) {
        disconnectedUser = uid;
        delete userSockets[uid];
        break;
      }
    }

    if (disconnectedUser) {
      for (const roomId in callRooms) {
        if (callRooms[roomId].has(disconnectedUser)) {
          callRooms[roomId].delete(disconnectedUser);

          io.to(roomId).emit("call-user-left-room", {
            roomId,
            userId: disconnectedUser,
          });

          if (callRooms[roomId].size === 0) delete callRooms[roomId];
        }
      }
    }
  });
});

// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on PORT ${PORT}`));
