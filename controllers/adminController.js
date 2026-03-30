import User from "../models/User.js";
import AppSettings from "../models/AppSettings.js";
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

// Get landing page settings
export const getLandingPageSettings = async (req, res) => {
  try {
    let settings = await AppSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await AppSettings.create({
        heroSlides: [
          {
            title: "Master Your Studies with TuitionMaster",
            subtitle: "Connecting students with expert tutors for personalized learning in Western Odisha.",
            imageUrl: "https://images.unsplash.com/photo-1513258496099-48168024adb0?auto=format&fit=crop&w=1920&q=80"
          },
          {
            title: "Verified Tutors, Proven Results",
            subtitle: "Every educator is vetted to ensure your academic success is in the right hands.",
            imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?auto=format&fit=crop&w=1920&q=80"
          },
          {
            title: "Learning Without Boundaries",
            subtitle: "Access the best teaching talent from colleges across the state, all in one place.",
            imageUrl: "https://images.unsplash.com/photo-1513258496099-48168024adb0?auto=format&fit=crop&w=1920&q=80"
          }
        ],
        aboutSection: {
          badge: "Our Story",
          title: "Empowering Education in Western Odisha",
          description1: "TuitionMaster was born from a simple observation: students struggle to find quality mentors nearby, while talented educators lack a platform to reach them.",
          description2: "Our mission is to ensure every student has access to the academic guidance they deserve through direct and verified connections.",
          imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?auto=format&fit=crop&w=800&q=80"
        },
        howItWorks: {
          title: "How It Works",
          subtitle: "Three simple steps to start your academic success",
          steps: [
            { number: "01", title: "Register", description: "Create your profile as a Student or Teacher and verify your credentials." },
            { number: "02", title: "Connect", description: "Browse through verified profiles and initiate a direct chat instantly." },
            { number: "03", title: "Learn", description: "Schedule your sessions and track your growth through our dashboard." }
          ]
        },
        testimonials: [
          { content: "Found a great Physics tutor from Jadavpur University within hours. Highly recommended!", author: "Rahul S. (Student)" },
          { content: "As a teacher, managing my batch logs and student chats has never been this organized.", author: "Priyanka D. (Tutor)" }
        ],
        contactSection: {
          title: "Get In Touch",
          subtitle: "Have questions? Our team is here to help you navigate your journey.",
          location: "Western Odisha, India",
          email: "support@tuitionmaster.com"
        },
        footer: {
          copyright: "© 2026 TuitionMaster. All rights reserved."
        }
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update landing page settings
export const updateLandingPageSettings = async (req, res) => {
  try {
    const updateData = req.body;
    let settings = await AppSettings.findOne();

    if (!settings) {
      settings = await AppSettings.create(updateData);
    } else {
      Object.assign(settings, updateData);
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};