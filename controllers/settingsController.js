import Settings from "../models/AppSettings.js";
import { v2 as cloudinary } from "cloudinary";

// ✅ 1. ADD THIS: The GET function that was missing
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    // If no settings exist yet, create a default one
    if (!settings) {
      settings = await Settings.create({
        siteName: "TuitionMaster",
        themeColor: "#c9a35e"
      });
    }
    res.status(200).json(settings);
  } catch (err) {
    console.error("Fetch Settings Error:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// ✅ 2. YOUR UPDATE function (already solid, just keeping it here)
export const updateSettings = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Convert memory buffer to DataURI for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "tuition_master_branding",
    });

    // Delete old logo from Cloudinary if it exists
    const currentSettings = await Settings.findOne();
    if (currentSettings?.logo?.public_id) {
      await cloudinary.uploader.destroy(currentSettings.logo.public_id).catch(err => 
        console.error("Cloudinary delete failed:", err)
      );
    }

    // Update database
    const updateData = {
      logo: {
        url: cldRes.secure_url,
        public_id: cldRes.public_id,
      }
    };

    const updatedSettings = await Settings.findOneAndUpdate(
      {}, 
      { $set: updateData }, 
      { upsert: true, new: true }
    );

    res.status(200).json(updatedSettings);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Logo update failed", error: err.message });
  }
};