import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";

import connectDB from "./config/db.js";
import User from "./models/User.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";

const app = express();
const httpServer = createServer(app);

// ===============================
// ✅ Middleware
// ===============================

app.use(express.json());

// Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://tutionmasters.netlify.app",
  "https://tutionmasterbacknend.onrender.com",
];    

// CORS Setup
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ===============================
// ✅ Socket.io Setup
// ===============================

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ===============================
// 🔥 SOCKET LOGIC
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

  // Send message
  socket.on("chat:message", ({ chatId, message }) => {
    if (!chatId || !message) return;
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
// ✅ Routes
// ===============================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API running perfectly");
});

// ===============================
// 👑 CREATE DEFAULT ADMIN
// ===============================

// const createDefaultAdmin = async () => {
//   try {
//     const adminEmail = "tutionadmin@gmail.com";

//     const existingAdmin = await User.findOne({ email: adminEmail });

//     if (!existingAdmin) {
//       const hashedPassword = await bcrypt.hash("Admin01@abc", 10);

//       await User.create({
//         fullName: "System Admin",
//         email: adminEmail,
//         phone: "9999999999",
//         password: hashedPassword,
//         aadhar: "000000000000",
//         registrationType: "admin",
//         isVerified: true,
//         isApproved: true,
//       });

//       console.log("✅ Default Admin Created");
//     } else {
//       console.log("ℹ️ Admin already exists");
//     }
//   } catch (err) {
//     console.error("❌ Admin creation failed:", err.message);
//   }
// };

// ===============================
// 🚀 CONNECT DB & START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    console.log("✅ Database Connected");

    // await createDefaultAdmin();

    httpServer.listen(PORT, () => {
      console.log(`🔥 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Failed:", err.message);
  });

// Export socket for controllers
export { io };