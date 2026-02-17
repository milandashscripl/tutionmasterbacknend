import express from "express";
import auth from "../middlewares/authMiddleware.js";
import {
  getProfile,
  updateProfile,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", auth, getProfile);
router.put("/me", auth, updateProfile);
router.delete("/me", auth, deleteUser);

export default router;
