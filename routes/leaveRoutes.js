import express from "express";
import {
  createLeaveRequest,
  processLeaveRequest,
  getTeacherLeaveRequests,
  getAllLeaveRequests,
  getLeaveBalance,
  cancelLeaveRequest
} from "../controllers/leaveController.js";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Teacher routes
router.post("/request", allowRoles("teacher"), createLeaveRequest);
router.get("/teacher", allowRoles("teacher"), getTeacherLeaveRequests);
router.get("/balance", allowRoles("teacher"), getLeaveBalance);
router.put("/:leaveId/cancel", allowRoles("teacher"), cancelLeaveRequest);

// Admin routes
router.get("/admin", allowRoles("admin"), getAllLeaveRequests);
router.put("/:leaveId/process", allowRoles("admin"), processLeaveRequest);

export default router;