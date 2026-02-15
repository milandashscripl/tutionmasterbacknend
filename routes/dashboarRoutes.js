import express from "express";
import { protect } from "../midllewares/authMiddleware.js";
import { allowRoles } from "../midllewares/roleMiddleware.js";

const router = express.Router();

// ✅ Teacher dashboard
router.get(
  "/teacher/dashboard",
  protect,
  allowRoles("teacher"),
  (req, res) => {
    res.json({ message: "Welcome Teacher" });
  }
);

// ✅ Student dashboard
router.get(
  "/student/dashboard",
  protect,
  allowRoles("student"),
  (req, res) => {
    res.json({ message: "Welcome Student" });
  }
);

export default router;
