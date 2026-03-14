import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import Course from "../models/Course.js";


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



// ===============================
// GET ALL COURSES
// ===============================
export const getCourses = async (req, res) => {
  try {

    const courses = await Course.find()
      .populate("instructor", "fullName profilePic");

    res.json(courses);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// GET SINGLE COURSE
// ===============================
export const getCourse = async (req, res) => {

  try {

    const course = await Course.findById(req.params.id)
      .populate("instructor", "fullName profilePic")
      .populate("contents.uploadedBy", "fullName profilePic");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// ===============================
// CREATE COURSE
// ===============================
export const createCourse = async (req, res) => {

  try {

    const { name, description, level, price, hours } = req.body;

    let thumbnailUrl = "";

    if (req.file) {

      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "courses"
      });

      thumbnailUrl = upload.secure_url;

    }

    const course = await Course.create({
      name,
      description,
      level,
      price,
      hours,
      thumbnail: thumbnailUrl,
      instructor: req.user._id
    });

    res.json(course);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// ===============================
// LIKE COURSE
// ===============================
export const likeCourse = async (req,res)=>{
try{

const course = await Course.findById(req.params.id);

if(!course) return res.status(404).json({message:"Course not found"});

const userId = req.user._id;

// remove dislike if exists
course.dislikes = course.dislikes.filter(
id => id.toString() !== userId.toString()
);

// toggle like
if(course.likes.includes(userId)){
course.likes = course.likes.filter(
id => id.toString() !== userId.toString()
);
}else{
course.likes.push(userId);
}

await course.save();

res.json(course);

}catch(err){
res.status(500).json({message:err.message});
}
};


// ===============================
// DISLIKE COURSE
// ===============================
export const dislikeCourse = async (req,res)=>{
try{

const course = await Course.findById(req.params.id);

if(!course) return res.status(404).json({message:"Course not found"});

const userId = req.user._id;

// remove like
course.likes = course.likes.filter(
id => id.toString() !== userId.toString()
);

// toggle dislike
if(course.dislikes.includes(userId)){
course.dislikes = course.dislikes.filter(
id => id.toString() !== userId.toString()
);
}else{
course.dislikes.push(userId);
}

await course.save();

res.json(course);

}catch(err){
res.status(500).json({message:err.message});
}
};


// ===============================
// COMMENT COURSE
// ===============================
export const addComment = async (req,res)=>{
try{

const {text} = req.body;

if(!text) return res.status(400).json({message:"Comment required"});

const course = await Course.findById(req.params.id);

if(!course) return res.status(404).json({message:"Course not found"});

course.comments.push({
user:req.user._id,
text
});

await course.save();

res.json(course);

}catch(err){
res.status(500).json({message:err.message});
}
};