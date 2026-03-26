const router = require("express").Router();
const { getSettings, updateSettings } = require("../controllers/settingsController");
const { adminAuth } = require("../middleware/auth"); // Your admin protection
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Cloudinary Config (Should be in your main server file or .env)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "tuition_master_branding",
    allowed_formats: ["jpg", "png", "jpeg", "svg"],
  },
});

const upload = multer({ storage: storage });

router.get("/", getSettings);
router.put("/", adminAuth, upload.single("logo"), updateSettings);

module.exports = router;