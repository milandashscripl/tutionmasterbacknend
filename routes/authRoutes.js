import express from "express";
import { register, login, registerVerify, forgotPassword, resetPassword } from "../controllers/authController.js";
import  upload  from "../midllewares/upload.js";

const router = express.Router();

router.post("/register", upload.single("profilePic"), register);
router.post("/verify-otp", registerVerify);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
