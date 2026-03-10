import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
fullName:{ type:String, required:true },
email:{ type:String, unique:true, sparse:true },
phone:{ type:String, unique:true, sparse:true },
password:{ type:String, required:true },

aadhar:{ type:String, required:true },

registrationType:{
type:String,
enum:["student","teacher","admin"],
required:true
},

otp:{ type:String },

isVerified:{ type:Boolean, default:false },
isApproved:{ type:Boolean, default:false },

gender:String,
age:Number,

address:{
text:String,
location:{
lat:Number,
lng:Number
}
},

profilePic:{
url:String,
public_id:String
},

studentDetails:{
standard:String,
board:String,
subjects:[String]
},

teacherDetails:{
teachingUpto:String,
subjectsExpert:[String],
distance:Number
},

settings:{
theme:{
type:String,
enum:["light","blue","green","purple"],
default:"light"
},
darkMode:{ type:Boolean, default:false },
notifications:{ type:Boolean, default:true }
}

},
{ timestamps:true }
);

export default mongoose.models.User || mongoose.model("User",userSchema);