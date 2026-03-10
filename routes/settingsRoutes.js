import express from "express";
import {getSettings,updateAppSettings} from "../controllers/settingsController.js";

const router = express.Router();

router.get("/",getSettings);
router.put("/",updateAppSettings);

export default router;