import express from "express";
import protect from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";
import {
  getPendingUsers,
  approveUser,
  adminCreateUser,
  getAllUsers,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);
router.use(allowRoles("admin"));

router.get("/pending", getPendingUsers);
router.put("/approve/:userId", approveUser);
router.post("/create-user", adminCreateUser);
router.get("/users", getAllUsers);

export default router;