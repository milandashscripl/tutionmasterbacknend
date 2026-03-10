import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema({

  siteName: {
    type: String,
    default: "TuitionMaster"
  },

  themeColor: {
    type: String,
    default: "#6366f1"
  },

  fontFamily: {
    type: String,
    default: "Poppins"
  },

  logo: {
    url: String,
    public_id: String
  }

});

export default mongoose.models.AppSettings ||
mongoose.model("AppSettings", AppSettingsSchema);