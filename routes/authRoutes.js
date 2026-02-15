// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";
import upload from "../midllewares/upload.js";

const router = express.Router();

router.post("/register", upload.single("profilePicture"), register);
router.post("/login", login);

export default router;
