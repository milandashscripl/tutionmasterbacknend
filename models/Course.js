import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },

  type: {
    type: String,
    enum: ["video", "pdf", "image"],
    required: true
  },

  url: { type: String, required: true },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  views: {
    type: Number,
    default: 0
  },

  likes: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],

  dislikes: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  },
  comments:[
{
user:{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
},
text:String,
createdAt:{
type:Date,
default:Date.now
}
}
]

});


const courseSchema = new mongoose.Schema(
{
  name: { type: String, required: true },

  description: { type: String, required: true },

  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner"
  },

  thumbnail: { type: String, default: "" },

  enrolledStudents: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],

  hours: { type: Number, default: 0 },

  price: { type: Number, default: 0 },

  contents: [contentSchema] // ⭐ course materials
},
{ timestamps: true }
);

export default mongoose.model("Course", courseSchema);