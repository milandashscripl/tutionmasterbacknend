import express from "express";
import {
  createChapter,
  getChapters,
  getChapterById,
  updateChapter,
  deleteChapter,
  getChapterFilters,
  updateChapterProgress,
  getChapterProgress,
  getChapterStats
} from "../controllers/chapterController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (for all authenticated users)
router.get("/", getChapters);
router.get("/filters", getChapterFilters);
router.get("/:chapterId", getChapterById);

// Admin routes
router.post("/", allowRoles("admin"), createChapter);
router.put("/:chapterId", allowRoles("admin"), updateChapter);
router.delete("/:chapterId", allowRoles("admin"), deleteChapter);

// Teacher routes
router.post("/progress", allowRoles("teacher"), updateChapterProgress);

// Student/Teacher routes for progress
router.get("/progress/:studentId", getChapterProgress);
router.get("/stats/:studentId", getChapterStats);

export default router;