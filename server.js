import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

// ✅ 1. INIT APP FIRST
const app = express();

// ✅ 2. MIDDLEWARES
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());

// ✅ 3. DATABASE
connectDB();

// ✅ 4. ROUTES
app.use("/api/auth", authRoutes);

// ✅ 5. TEST ROUTE
app.get("/", (req, res) => {
  res.send("🚀 API running perfectly");
});

// ✅ 6. SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
