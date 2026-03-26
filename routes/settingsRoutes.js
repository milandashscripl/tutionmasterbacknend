import express from "express";
const router = express.Router();
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { adminAuth } from "../midllewares/adminAuth.js"; 
import upload from "../midllewares/upload.js"; 

router.get("/", getSettings);
router.put("/", adminAuth, upload.single("logo"), updateSettings);

export default router;