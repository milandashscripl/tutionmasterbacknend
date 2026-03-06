import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema({

  navbarLogo:{
    url:String,
    public_id:String
  }

});

export default mongoose.model("AppSettings",appSettingsSchema);