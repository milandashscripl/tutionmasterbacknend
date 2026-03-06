import express from "express";
import protect from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

import {
  getPendingUsers,
  approveUser,
  rejectUser,
  removeUser,
  getAllUsers,
  updateNavbarLogo,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);
router.use(allowRoles("admin"));

router.get("/users", getAllUsers);

router.get("/pending", getPendingUsers);

router.put("/approve/:userId", approveUser);

router.delete("/reject/:userId", rejectUser);

router.delete("/remove/:userId", removeUser);

router.put("/settings/logo", updateNavbarLogo);
export default router;