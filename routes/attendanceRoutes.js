import express from "express";
import {
  markAttendance,
  updateAttendanceStatus,
  getStudentAttendance,
  getTeacherAttendance,
  getTodayAttendance,
  getAttendanceStats,
  markTeacherAttendance,
  getTeacherDaywiseAttendance,
  getStudentDaywiseAttendance,
  getAttendanceSummary
} from "../controllers/attendanceController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Teacher routes
router.post("/mark", allowRoles("teacher"), markAttendance);
router.post("/mark-daily", allowRoles("teacher"), markTeacherAttendance);
router.put("/:attendanceId/status", allowRoles("teacher"), updateAttendanceStatus);
router.get("/teacher/today", allowRoles("teacher"), getTodayAttendance);
router.get("/teacher", allowRoles("teacher"), getTeacherAttendance);
router.get("/teacher/daywise", allowRoles("teacher"), getTeacherDaywiseAttendance);

// Student routes
router.get("/student", allowRoles("student"), getStudentAttendance);
router.get("/student/daywise", allowRoles("student"), getStudentDaywiseAttendance);

// Common routes
router.get("/stats", getAttendanceStats);
router.get("/summary", getAttendanceSummary);

export default router;