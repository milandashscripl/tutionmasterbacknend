import User from "../models/User.js";

// READ
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// UPDATE
export const updateProfile = async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.user._id,
    req.body,
    { new: true }
  );
  res.json(updated);
};

// DELETE
export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "Account deleted" });
};
