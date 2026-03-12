import User from "../models/User.js";
import bcrypt from "bcryptjs";


export const getPendingUsers = async(req,res)=>{

try{

const users = await User.find({
isVerified:true,
isApproved:false
}).select("-password");

res.json(users);

}catch(err){
res.status(500).json({message:"Server error"});
}

};


// Approve user


export const approveUser = async (req, res) => {
  try {

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.isApproved = true;

    await user.save();

    res.json({ message: "User approved successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Reject user request
export const rejectUser = async (req, res) => {

  try {

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    await user.deleteOne();

    res.json({ message: "User request rejected and deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// Admin removes existing user
export const removeUser = async (req, res) => {

  try {

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.registrationType === "admin")
      return res.status(400).json({ message: "Admin cannot be removed" });

    await user.deleteOne();

    res.json({ message: "User removed successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};


// Get all users
export const getAllUsers = async (req, res) => {

  try {

    const users = await User.find({}).select("-password");

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};



export const updateNavbarLogo = async (req,res)=>{

  try{

    const {url, public_id} = req.body;

    let settings = await AppSettings.findOne();

    if(!settings){
      settings = await AppSettings.create({
        navbarLogo:{url,public_id}
      });
    }else{
      settings.navbarLogo = {url,public_id};
      await settings.save();
    }

    res.json(settings);

  }catch(err){
    res.status(500).json({message:err.message});
  }

};