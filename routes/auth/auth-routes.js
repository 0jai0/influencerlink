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
} = require("../../controllers/auth/auth-controller");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forget-password", forgotPassword);
router.post("/logout", logoutUser);
router.put('/updateUser/:userId', updateUser);
router.get('/users', getAllUsers);
router.get('/user/:id', getUserById);
router.get("/check-auth", authMiddleware, (req, res) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    message: "Authenticated user!",
    user,
  });
});

module.exports = router;
