import express from "express";
const router = express.Router();
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { adminAuth } from "../midllewares/adminAuth.js"; // Fixed folder spelling
import upload from "../midllewares/upload.js";    // Reuse your existing middleware

router.get("/", getSettings);

// Use the same 'upload' middleware you use for registration
router.put("/", adminAuth, upload.single("logo"), updateSettings);

export default router;