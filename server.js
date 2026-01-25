import dotenv from "dotenv";
dotenv.config();

import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
const cors = require("cors");

app.use(cors({
  origin: "*",   // allow all (for now)
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const app = express();

connectDB();

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
