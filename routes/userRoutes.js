import express from "express";
import auth from "../midllewares/authMiddleware.js";
import upload from "../midllewares/upload.js";
import {
  getProfile,
  updateProfile,
  deleteUser,
  updateUserSettings,
  getAllUsers,
  getMatchedTeachers
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", auth, getAllUsers);
router.get("/me", auth, getProfile);
router.put("/me", auth, upload.single("profilePic"), updateProfile);
router.put("/settings", auth,   updateUserSettings);
router.delete("/me", auth, deleteUser);
// Add this line (ensure it's after the 'auth' middleware)
router.get("/matches", auth, getMatchedTeachers);

export default router;