import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";

const app = express();
const httpServer = createServer(app);

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://tutionmasters.netlify.app",
  "https://tutionmasterbacknend.onrender.com",
];

// ✅ Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ✅ Express middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ✅ Connect Database
connectDB();

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/courses", courseRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API running perfectly");
});

// ===============================
// 🔥 SOCKET LOGIC (Improved)
// ===============================

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Register logged-in user
  socket.on("user:register", (userId) => {
    if (!userId) return;
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered`);
  });

  // Join chat room
  socket.on("chat:join", (chatId) => {
    if (!chatId) return;
    socket.join(`chat:${chatId}`);
    console.log(`Socket ${socket.id} joined room chat:${chatId}`);
  });

  // Send message (REALTIME)
  socket.on("chat:message", ({ chatId, message }) => {
    if (!chatId || !message) return;

    // Send to everyone EXCEPT sender
    socket.to(`chat:${chatId}`).emit("chat:message:new", message);
  });

  // Typing indicator
  socket.on("chat:typing", ({ chatId, userId, isTyping }) => {
    if (!chatId || !userId) return;

    socket.to(`chat:${chatId}`).emit("chat:user:typing", {
      userId,
      isTyping,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// ===============================
// 🚀 Start Server
// ===============================

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});

export { io };