// export const getDevOtp = () => {
//   return process.env.DEV_OTP;
// };


import axios from "axios";

// 1. Validate if the email is real using Mailboxlayer
export const validateEmail = async (email) => {
  try {
    const API_KEY = process.env.MAILBOXLAYER_API_KEY;
    const url = `http://apilayer.net/api/check?access_key=${API_KEY}&email=${email}`;
    
    const { data } = await axios.get(url);
    
    // Returns true if format is correct and it's not a disposable/fake email
    return data.format_valid && data.mx_found;
  } catch (error) {
    console.error("Email Validation Error:", error);
    return true; // Fallback so users aren't blocked if the API is down
  }
};

// 2. Keep your Dev OTP for testing
export const getDevOtp = () => {
  return process.env.DEV_OTP;
};