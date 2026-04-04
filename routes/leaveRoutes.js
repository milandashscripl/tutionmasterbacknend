import express from "express";
import {
  createLeaveRequest,
  processLeaveRequest,
  getTeacherLeaveRequests,
  getAllLeaveRequests,
  getLeaveBalance,
  cancelLeaveRequest,
  createStudentLeaveRequest,
  getStudentLeaveRequests,
  getStudentLeaveBalance,
  cancelStudentLeaveRequest
} from "../controllers/leaveController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Teacher routes
router.post("/teacher/request", allowRoles("teacher"), createLeaveRequest);
router.get("/teacher", allowRoles("teacher"), getTeacherLeaveRequests);
router.get("/teacher/balance", allowRoles("teacher"), getLeaveBalance);
router.put("/teacher/:leaveId/cancel", allowRoles("teacher"), cancelLeaveRequest);

// Student routes
router.post("/student/request", allowRoles("student"), createStudentLeaveRequest);
router.get("/student", allowRoles("student"), getStudentLeaveRequests);
router.get("/student/balance", allowRoles("student"), getStudentLeaveBalance);
router.put("/student/:leaveId/cancel", allowRoles("student"), cancelStudentLeaveRequest);

// Keep backward compat for teacher endpoints
router.post("/request", allowRoles("teacher"), createLeaveRequest);
router.get("/balance", allowRoles("teacher"), getLeaveBalance);
router.put("/:leaveId/cancel", allowRoles("teacher"), cancelLeaveRequest);

// Admin routes
router.get("/admin", allowRoles("admin"), getAllLeaveRequests);
router.put("/:leaveId/process", allowRoles("admin"), processLeaveRequest);

export default router;