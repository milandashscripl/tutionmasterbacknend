const Settings = require("../models/Settings");
const cloudinary = require("cloudinary").v2;

// GET Settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE Settings (Logo Upload)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (req.file) {
      // If an old logo exists, delete it from Cloudinary first
      if (settings.logo?.public_id) {
        await cloudinary.uploader.destroy(settings.logo.public_id);
      }

      // Upload new file to Cloudinary
      // req.file.path comes from Multer-Storage-Cloudinary
      settings.logo = {
        url: req.file.path, 
        public_id: req.file.filename
      };
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
};