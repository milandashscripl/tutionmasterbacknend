import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },

    aadhar: { type: String, required: true },

    address: {
      text: String,
      location: {
        lat: Number,
        lng: Number,
      },
    },

    profilePic: {
      url: String,
      public_id: String,
    },

    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
