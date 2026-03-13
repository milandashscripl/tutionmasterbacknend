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
        folder: "courses",
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
      instructor: req.user._id,
    });

    res.json(course);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ===============================
// UPLOAD COURSE CONTENT
// ===============================
export const uploadCourseContent = async (req, res) => {

  try {

    const { title, type } = req.body;
    const { courseId } = req.params;

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File required" });
    }

    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: "course_contents",
      resource_type: "auto",
    });

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.contents.push({
      title,
      type,
      url: upload.secure_url,
      uploadedBy: req.user._id
    });

    await course.save();

    res.json(course);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ===============================
// LIKE CONTENT
// ===============================
export const likeContent = async (req, res) => {

  try {

    const { contentId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ "contents._id": contentId });

    const content = course.contents.id(contentId);

    if (!content.likes.includes(userId)) {

      content.likes.push(userId);
      content.dislikes.pull(userId);

    }

    await course.save();

    res.json(content);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// ===============================
// DISLIKE CONTENT
// ===============================
export const dislikeContent = async (req, res) => {

  try {

    const { contentId } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ "contents._id": contentId });

    const content = course.contents.id(contentId);

    if (!content.dislikes.includes(userId)) {

      content.dislikes.push(userId);
      content.likes.pull(userId);

    }

    await course.save();

    res.json(content);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// ===============================
// COMMENT CONTENT
// ===============================
export const commentContent = async (req, res) => {

  try {

    const { contentId } = req.params;
    const { text } = req.body;

    const course = await Course.findOne({ "contents._id": contentId });

    const content = course.contents.id(contentId);

    content.comments.push({
      user: req.user._id,
      text
    });

    await course.save();

    res.json(content);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};