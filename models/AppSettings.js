import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  logo: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" }
  },
  siteName: { type: String, default: "TuitionMaster" },
  themeColor: { type: String, default: "#c9a35e" },

  // Landing Page Content
  heroSlides: [{
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    imageUrl: { type: String, required: true },
    public_id: { type: String, default: "" }
  }],

  // Premium membership configuration
  premiumConfig: {
    studentPremiumPrice: { type: Number, default: 500 },
    teacherPremiumPrice: { type: Number, default: 500 },
    normalTeacherMaxFee: { type: Number, default: 2500 },
    highRatedTeacherThreshold: { type: Number, default: 4.5 },
    highPayingStudentThreshold: { type: Number, default: 4.5 },
    premiumDurationDays: { type: Number, default: 30 },
  },

  aboutSection: {
    badge: { type: String, default: "Our Story" },
    title: { type: String, default: "Empowering Education in Western Odisha" },
    description1: { type: String, default: "TuitionMaster was born from a simple observation: students struggle to find quality mentors nearby, while talented educators lack a platform to reach them." },
    description2: { type: String, default: "Our mission is to ensure every student has access to the academic guidance they deserve through direct and verified connections." },
    imageUrl: { type: String, default: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?auto=format&fit=crop&w=800&q=80" },
    public_id: { type: String, default: "" }
  },

  howItWorks: {
    title: { type: String, default: "How It Works" },
    subtitle: { type: String, default: "Three simple steps to start your academic success" },
    steps: [{
      number: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true }
    }]
  },

  testimonials: [{
    content: { type: String, required: true },
    author: { type: String, required: true }
  }],

  contactSection: {
    title: { type: String, default: "Get In Touch" },
    subtitle: { type: String, default: "Have questions? Our team is here to help you navigate your journey." },
    location: { type: String, default: "Western Odisha, India" },
    email: { type: String, default: "support@tuitionmaster.com" }
  },

  footer: {
    copyright: { type: String, default: "© 2026 TuitionMaster. All rights reserved." }
  }
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema, "settings");