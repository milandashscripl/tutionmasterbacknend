import express from "express";
import auth from "../midllewares/authMiddleware.js";
import upload from "../midllewares/upload.js";
import {
  getProfile,
  updateProfile,
  deleteUser,
  updateSettings,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", auth, getProfile);
router.put("/me", auth, upload.single("profilePic"), updateProfile);
router.put("/settings", auth, updateSettings);
router.delete("/me", auth, deleteUser);

export default router;
