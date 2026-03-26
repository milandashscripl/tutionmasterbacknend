import Settings from "../models/AppSettings.js";
import { v2 as cloudinary } from "cloudinary";

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// controllers/settingsController.js

export const updateSettings = async (req, res) => {
  try {
    // 1. Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    // 2. Delete old logo from Cloudinary if it exists
    if (settings.logo?.public_id) {
      await cloudinary.uploader.destroy(settings.logo.public_id);
    }

    // 3. Update with new data
    // Note: multer-storage-cloudinary provides 'path' for the URL 
    // and 'filename' for the public_id
    settings.logo = {
      url: req.file.path || req.file.secure_url, 
      public_id: req.file.filename || req.file.public_id
    };

    await settings.save();
    
    // 4. Return the updated object
    res.status(200).json(settings);
  } catch (err) {
    console.error("Backend Update Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};