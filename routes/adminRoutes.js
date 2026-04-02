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
  getLandingPageSettings,
  updateLandingPageSettings,
} from "../controllers/adminController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import upload from "../midllewares/upload.js";

const router = express.Router();

// Public route (must be before middleware)
router.get("/settings/public", getSettings);

// Protected Admin routes
router.use(protect);
router.use(allowRoles("admin"));

router.get("/pending", getPendingUsers);
router.put("/approve/:userId", approveUser);
router.delete("/reject/:userId", rejectUser);
router.delete("/remove/:userId", removeUser);
router.get("/users", getAllUsers);

// Landing page settings routes
router.get("/landing-page", getLandingPageSettings);
router.put("/landing-page", upload.any(), updateLandingPageSettings);

// ... your existing routes ...
router.put("/settings/update", upload.single("logo"), updateSettings);
export default router;