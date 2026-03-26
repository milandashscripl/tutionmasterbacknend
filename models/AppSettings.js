import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  logo: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" }
  },
  siteName: { type: String, default: "TuitionMaster" },
  themeColor: { type: String, default: "#c9a35e" }
}, { timestamps: true }); // <--- Add this

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema, "settings");