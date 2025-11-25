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
// userId -> socketId
// =====================================
const userSockets = {};

// =====================================
// GROUP CALL ROOM STORE
// roomId -> Set<userId>
// =====================================
const callRooms = {};

// =====================================
// MIDDLEWARE
// =====================================
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// =====================================
// STATIC FILES (UPLOADS / VIDEO)
// =====================================
app.use("/uploads", express.static("uploads"));

// VIDEO CHUNK SUPPORT
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
// SOCKET.IO SERVER
// =====================================
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // -------------------------------
  // USER REGISTRATION FOR CALLS
  // -------------------------------
  socket.on("register-user", (userId) => {
    userSockets[userId] = socket.id;
    socket.userId = userId;
    console.log(`Registered: ${userId} -> ${socket.id}`);
  });

  // -------------------------------
  // GROUP CHAT
  // -------------------------------
  socket.on("join_group", (groupId) => socket.join(groupId));
  socket.on("leave_group", (groupId) => socket.leave(groupId));

  socket.on("send_group_message", (msg) => {
    io.to(msg.groupId).emit("receive_group_message", msg);
  });

  // -------------------------------
  // GROUP CALL *UI BANNER ONLY*
  // -------------------------------
  socket.on("start-group-call", ({ groupId, callerId, callerName }) => {
    socket.to(groupId).emit("incoming-group-call", {
      groupId,
      callerId,
      callerName,
    });
  });

  // ================================================================
  //                    1-ON-1 WEBRTC SIGNALING
  // ================================================================
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

  socket.on("end-call", ({ toUserId }) => {
    const target = userSockets[toUserId];
    if (target) io.to(target).emit("call-ended");
  });

  // ================================================================
  //                GROUP VIDEO CALL (PURE WEBRTC MESH)
  // ================================================================

  // 1. JOIN CALL ROOM
  socket.on("join-call-room", ({ roomId, userId }) => {
    console.log(`📞 User ${userId} joined call room ${roomId}`);

    if (!callRooms[roomId]) callRooms[roomId] = new Set();

    const existingUsers = Array.from(callRooms[roomId]);
    callRooms[roomId].add(userId);

    socket.join(roomId);

    // Send existing users back to the new user
    socket.emit("call-room-users", {
      roomId,
      users: existingUsers,
    });

    // Notify others
    socket.to(roomId).emit("call-user-joined-room", {
      roomId,
      userId,
    });
  });

  // 2. LEAVE CALL ROOM
  socket.on("leave-call-room", ({ roomId, userId }) => {
    console.log(`📞 User ${userId} left call room ${roomId}`);

    socket.leave(roomId);

    if (callRooms[roomId]) {
      callRooms[roomId].delete(userId);

      if (callRooms[roomId].size === 0) {
        delete callRooms[roomId];
      }
    }

    socket.to(roomId).emit("call-user-left-room", {
      roomId,
      userId,
    });
  });

  // 3. OFFER
  socket.on("group-call-offer", ({ roomId, toUserId, fromUserId, offer }) => {
    const target = userSockets[toUserId];
    if (target) {
      io.to(target).emit("group-call-offer", {
        roomId,
        fromUserId,
        offer,
      });
    }
  });

  // 4. ANSWER
  socket.on("group-call-answer", ({ roomId, toUserId, fromUserId, answer }) => {
    const target = userSockets[toUserId];
    if (target) {
      io.to(target).emit("group-call-answer", {
        roomId,
        fromUserId,
        answer,
      });
    }
  });

  // 5. ICE CANDIDATES
  socket.on(
    "group-ice-candidate",
    ({ roomId, toUserId, fromUserId, candidate }) => {
      const target = userSockets[toUserId];
      if (target) {
        io.to(target).emit("group-ice-candidate", {
          roomId,
          fromUserId,
          candidate,
        });
      }
    }
  );

  // -------------------------------
  // DISCONNECT CLEANUP
  // -------------------------------
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    let disconnectedUser = null;

    // remove from userSockets
    for (const uid in userSockets) {
      if (userSockets[uid] === socket.id) {
        disconnectedUser = uid;
        delete userSockets[uid];
        break;
      }
    }

    // remove from call rooms
    if (disconnectedUser) {
      for (const roomId in callRooms) {
        if (callRooms[roomId].has(disconnectedUser)) {
          callRooms[roomId].delete(disconnectedUser);

          io.to(roomId).emit("call-user-left-room", {
            roomId,
            userId: disconnectedUser,
          });

          if (callRooms[roomId].size === 0) {
            delete callRooms[roomId];
          }
        }
      }
    }
  });
});

// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
