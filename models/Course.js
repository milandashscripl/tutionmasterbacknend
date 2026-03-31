import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    // Videos array with both short clips and long tutorials
    videos: [
      {
        title: String,
        description: String,
        url: String, // Cloudinary video URL
        duration: Number, // in seconds
        type: {
          type: String,
          enum: ["short", "long"],
          default: "long",
        },
        thumbnail: String, // Cloudinary image URL
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Engagement metrics
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Comments with nested replies
    comments: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: String,
        createdAt: { type: Date, default: Date.now },
        likes: { type: Number, default: 0 },
        replies: [
          {
            teacher: mongoose.Schema.Types.ObjectId,
            text: String,
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    // Reviews and ratings
    reviews: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Aggregate ratings
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // Course stats
    enrolledStudents: {
      type: Number,
      default: 0,
    },
    enrolledBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Thumbnail for course display
    thumbnail: String,

    // Course status
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Course ||
  mongoose.model("Course", courseSchema);
