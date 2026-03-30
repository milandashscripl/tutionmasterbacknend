import Settings from "../models/AppSettings.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Helper for Cloudinary Stream Upload
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// GET SETTINGS (Public - No Auth Required)
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        siteName: "TuitionMaster",
        themeColor: "#c9a35e",
        logo: { url: "", public_id: "" }
      });
    }
    console.log("Settings returned:", settings);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE SETTINGS (Admin Only)
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    const { siteName, themeColor } = req.body;
    if (siteName) settings.siteName = siteName;
    if (themeColor) settings.themeColor = themeColor;

    // Handle Logo Upload via Cloudinary
    if (req.file) {
      // Cleanup old logo if exists
      if (settings.logo?.public_id) {
        await cloudinary.uploader.destroy(settings.logo.public_id);
      }
      
      const result = await uploadToCloudinary(req.file.buffer, "site_branding");
      settings.logo = { url: result.secure_url, public_id: result.public_id };
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};