import express from "express";
import auth from "../midllewares/authMiddleware.js";
import upload from "../midllewares/upload.js";
import {
  getProfile,
  updateProfile,
  deleteUser,
  updateUserSettings,
  getAllUsers
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", auth, getAllUsers);
router.get("/me", auth, getProfile);
router.put("/me", auth, upload.single("profilePic"), updateProfile);
router.put("/settings", auth,   updateUserSettings);
router.delete("/me", auth, deleteUser);

export default router;