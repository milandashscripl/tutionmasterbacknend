import AppSettings from "../models/AppSettings.js";
import cloudinary from "../config/cloudinary.js";

export const getSettings = async(req,res)=>{

  let settings = await AppSettings.findOne();

  if(!settings){
    settings = await AppSettings.create({});
  }

  res.json(settings);

};


export const updateAppSettings = async (req, res) => {

  try {

    let settings = await AppSettings.findOne();

    if (!settings) {
      settings = await AppSettings.create({});
    }

    const { siteName, themeColor, fontFamily } = req.body;

    if (siteName) settings.siteName = siteName;
    if (themeColor) settings.themeColor = themeColor;
    if (fontFamily) settings.fontFamily = fontFamily;

    if (req.file) {

      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "settings"
      });

      settings.logo = {
        url: upload.secure_url,
        public_id: upload.public_id
      };

    }

    await settings.save();

    res.json(settings);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

};