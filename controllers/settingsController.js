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
    // 1. Check if a file was actually uploaded by the middleware
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // 2. Prepare the update data
    // Use req.file.path (URL) and req.file.filename (Public ID) from Cloudinary storage
    const updateData = {
      logo: {
        url: req.file.path,
        public_id: req.file.filename,
      }
    };

    // Add this inside updateSettings BEFORE the findOneAndUpdate call
const currentSettings = await Settings.findOne();
if (currentSettings?.logo?.public_id) {
    try {
        await cloudinary.uploader.destroy(currentSettings.logo.public_id);
    } catch (err) {
        console.error("Cloudinary delete failed:", err);
    }
}

    // 3. Find the ONLY settings document and update it
    // upsert: true means "Create it if it doesn't exist"
    // new: true means "Return the updated version"
    const updatedSettings = await Settings.findOneAndUpdate(
      {}, // Empty filter finds the first/only document
      { $set: updateData }, 
      { upsert: true, new: true, runValidators: true }
    );

    console.log("Database updated successfully:", updatedSettings.logo.url);
    
    res.status(200).json(updatedSettings);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error during logo update", error: err.message });
  }
};