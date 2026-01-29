import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    provider: {
      type: String,
      enum: ["google", "facebook"],
      required: true,
    },
    providerId: { type: String, required: true },
    avatar: String,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
