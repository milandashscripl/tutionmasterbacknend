import Settings from "../models/AppSettings.js";
import { v2 as cloudinary } from "cloudinary";

export const updateSettings = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // 1. Manually upload the buffer to Cloudinary (Since you use memoryStorage)
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "tuition_master_branding",
    });

    // 2. Delete old logo if it exists
    const currentSettings = await Settings.findOne();
    if (currentSettings?.logo?.public_id) {
      await cloudinary.uploader.destroy(currentSettings.logo.public_id).catch(err => 
        console.error("Cloudinary delete failed:", err)
      );
    }

    // 3. Update the database with Cloudinary's response
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