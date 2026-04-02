import express from "express";
import {
  markAttendance,
  updateAttendanceStatus,
  getStudentAttendance,
  getTeacherAttendance,
  getTodayAttendance,
  getAttendanceStats
} from "../controllers/attendanceController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Teacher routes
router.post("/mark", allowRoles("teacher"), markAttendance);
router.put("/:attendanceId/status", allowRoles("teacher"), updateAttendanceStatus);
router.get("/teacher/today", allowRoles("teacher"), getTodayAttendance);
router.get("/teacher", allowRoles("teacher"), getTeacherAttendance);

// Student routes
router.get("/student", allowRoles("student"), getStudentAttendance);

// Common routes
router.get("/stats", getAttendanceStats);

export default router;