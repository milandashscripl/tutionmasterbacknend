import User from "../models/User.js";
import generateToken from "../utils/jwt.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google token missing" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      name,
      picture,
    } = payload;

    let user = await User.findOne({
      provider: "google",
      providerId: googleId,
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        provider: "google",
        providerId: googleId,
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google Auth Error:", error.message);
    res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
