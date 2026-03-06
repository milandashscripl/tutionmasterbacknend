// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     email: { type: String, unique: true, sparse: true },
//     phone: { type: String, unique: true, sparse: true },
//     password: { type: String, required: true },

//     aadhar: { type: String, required: true },
//     registrationType: { type: String, enum: ["student", "teacher", "admin"], required: true },
//     otp: { type: String },

//     address: {
//       text: String,
//       location: {
//         lat: Number,
//         lng: Number,
//       },
//     },

//     profilePic: {
//       url: String,
//       public_id: String,
//     },

//     isVerified: { type: Boolean, default: false },

//     settings: {
//       theme: { type: String, enum: ["light", "blue", "green", "purple"], default: "light" },
//       darkMode: { type: Boolean, default: false },
//       notifications: { type: Boolean, default: true },
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("User", userSchema);



import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  /* BASIC INFO */

  fullName: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },

  aadhar: { type: String, required: true },

  registrationType: {
    type: String,
    enum: ["student", "teacher", "admin"],
    required: true
  },

  age: Number,
  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },

  /* OTP SYSTEM */

otp: { type: String },

isVerified: { type: Boolean, default: false }, // OTP verified
isApproved: { type: Boolean, default: false }, // Admin approval

  /* ADDRESS */

  address: {
    text: String,

    location: {
      lat: Number,
      lng: Number
    }
  },

  /* PROFILE */

  profilePic: {
    url: String,
    public_id: String
  },

  /* STUDENT DETAILS */

  studentDetails: {

    classStandard: String,

    educationBoard: {
      type: String,
      enum: ["CBSE", "CHSE", "ICSE", "State Board", "Other"]
    },

    subjectsPreferred: [
      String
    ]

  },

  /* TEACHER DETAILS */

  teacherDetails: {

    teachingUpto: {
      type: String,
      enum: [
        "up to 4th",
        "up to 7th",
        "up to 10th",
        "up to 12th"
      ]
    },

    subjectsExpert: [
      String
    ],

    maxDistanceKM: Number
  },

  /* SETTINGS */

  settings: {
    theme: {
      type: String,
      enum: ["light", "blue", "green", "purple"],
      default: "light"
    },

    darkMode: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true }
  }

},
{ timestamps: true }
);

export default mongoose.model("User", userSchema);