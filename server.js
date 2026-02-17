import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
// import dashboardRoutes from "./routes/dashboarRoutes.js";

console.log("Cloudinary Debug:", {
  name: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "KEY_OK" : "KEY_MISSING",
  secret: process.env.CLOUDINARY_API_SECRET ? "SECRET_OK" : "SECRET_MISSING",
});


console.log(process.env.EMAIL_USER);
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


// app.use("/api", dashboardRoutes)
// ✅ 6. SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
