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
// import dashboardRoutes from "./routes/dashboarRoutes.js";

console.log("Cloudinary Debug:", {
  name: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "KEY_OK" : "KEY_MISSING",
  secret: process.env.CLOUDINARY_API_SECRET ? "SECRET_OK" : "SECRET_MISSING",
});


console.log(process.env.EMAIL_USER);
// ✅ 1. INIT APP FIRST
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://tutionmasterbacknend.onrender.com",
      "https://tutionmasters.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ✅ 2. MIDDLEWARES

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://tutionmasterbacknend.onrender.com",
    "https://tutionmasters.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
  // if you use cookies/auth headers, enable credentials
  // credentials: true,
}));

app.use(express.json());

// ✅ 3. DATABASE
connectDB();

// ✅ 4. ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/courses", courseRoutes);

// ✅ 5. SOCKET.IO EVENTS
const userSockets = new Map(); // Map to store user ID -> socket ID

io.on("connection", (socket) => {
  console.log(`New user connected: ${socket.id}`);

  // Register user
  socket.on("user:register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Join chat room
  socket.on("chat:join", (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  // Send message
  socket.on("chat:message", (data) => {
    const { chatId, message } = data;
    io.to(`chat:${chatId}`).emit("chat:message:new", message);
  });

  // Typing indicator
  socket.on("chat:typing", (data) => {
    const { chatId, userId, isTyping } = data;
    io.to(`chat:${chatId}`).emit("chat:user:typing", { userId, isTyping });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});
app.get("/", (req, res) => {
  res.send("🚀 API running perfectly");
});

// ✅ 6. TEST ROUTE - MOVED UP

// ✅ 7. SERVER
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});

export { io };
