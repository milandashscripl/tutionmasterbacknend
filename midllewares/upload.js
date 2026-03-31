import multer from "multer";

const storage = multer.memoryStorage();

// General upload with 5MB limit (for images)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Video upload with larger limit
const uploadVideo = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
});

export default upload;
export { uploadVideo };
