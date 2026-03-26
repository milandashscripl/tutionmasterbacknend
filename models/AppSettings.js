import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  logo: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" }
  },
  // You can keep these for future use
  siteName: { type: String, default: "TuitionMaster" },
  themeColor: { type: String, default: "#c9a35e" }
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);