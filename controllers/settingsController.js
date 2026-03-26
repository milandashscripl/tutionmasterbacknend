import Settings from "../models/AppSettings.js";
import { v2 as cloudinary } from "cloudinary";

// GET Settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    // Create a default settings doc if none exists
    if (!settings) settings = await Settings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE Settings (Logo Upload)
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (req.file) {
      // If an old logo exists, delete it from Cloudinary first
      if (settings.logo?.public_id) {
        try {
          await cloudinary.uploader.destroy(settings.logo.public_id);
        } catch (delErr) {
          console.error("Old logo deletion failed:", delErr);
          // We continue anyway so the new logo can be saved
        }
      }

      // req.file.path and req.file.filename are provided by multer-storage-cloudinary
      settings.logo = {
        url: req.file.path, 
        public_id: req.file.filename
      };
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};