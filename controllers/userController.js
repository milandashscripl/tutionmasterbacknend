import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

// READ
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// UPDATE
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    // if multipart file present, upload to cloudinary (if configured)
    if (req.file) {
      try {
        if (req.file.buffer && process.env.CLOUDINARY_API_KEY) {
          const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
          const upload = await cloudinary.uploader.upload(dataUri, { folder: "users" });
          updates.profilePic = { url: upload.secure_url, public_id: upload.public_id };
        }
      } catch (err) {
        console.error("Profile pic upload failed:", err?.message || err);
      }
    }

    const allowed = ["fullName", "email", "phone", "aadhar", "address", "addressText", "lat", "lng", "registrationType", "profilePic"];
    const payload = {};
    Object.keys(updates).forEach((k) => {
      if (allowed.includes(k)) payload[k] = updates[k];
    });

    // if addressText/lat/lng provided, map into address object
    if (updates.addressText || updates.lat || updates.lng) {
      payload.address = {
        text: updates.addressText || req.user.address?.text,
        location: {
          lat: updates.lat ? Number(updates.lat) : req.user.address?.location?.lat,
          lng: updates.lng ? Number(updates.lng) : req.user.address?.location?.lng,
        },
      };
    }

    const updated = await User.findByIdAndUpdate(req.user._id, payload, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "Account deleted" });
};

// UPDATE SETTINGS
export const updateUserSettings = async (req,res)=>{
try{

const {theme,darkMode,notifications} = req.body;

const updated = await User.findByIdAndUpdate(
req.user._id,
{
settings:{
theme,
darkMode,
notifications
}
},
{new:true}
).select("-password");

res.json(updated);

}
catch(err){
res.status(500).json({message:err.message});
}
};


// GET ALL USERS (for chat list)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id }, // exclude current user
    }).select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
