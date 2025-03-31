const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
  forgotPassword,
  updateUser,
  getAllUsers ,
  getUserById,
  googleLogin,
} = require("../../controllers/auth/auth-controller");
const User = require("../../models/PageUser"); 
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forget-password", forgotPassword);
router.post("/logout", logoutUser);
router.put('/updateUser/:userId', updateUser);
router.get('/users', getAllUsers);
router.get('/user/:id', getUserById);
router.post('/google', googleLogin);
// In auth-routes.js
router.get("/check-auth", authMiddleware, async (req, res) => {
  try {
    const userId = req.headers.userid; // Extract userId from headers

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
