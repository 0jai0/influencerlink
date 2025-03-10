const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const setupSocket = require("./socket/socket.js");

const collectionRoutes = require("./routes/message/collection.routes");
const messageRoutes = require("./routes/message/message.routes.js");
const authRouter = require("./routes/auth/auth-routes");
const otpRouter = require("./routes/auth/otp-routes");

dotenv.config();
const app = express();

// ✅ Allowed Origins
const allowedOrigins = [
  "http://localhost:3000", // Local Dev
  "https://influencerlink-af410.firebaseapp.com" // Production Frontend
];

// ✅ CORS Middleware (Put this FIRST)
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true // Allow cookies & authorization headers
}));

// ✅ Middleware Setup
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ Debugging Middleware (Check Headers & Cookies)
app.use((req, res, next) => {
  console.log("Request URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Cookies:", req.cookies);
  next();
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_DB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((error) => console.error("❌ MongoDB Error:", error));

// ✅ Routes
app.use("/api/pageowners", authRouter);
app.use("/api/messages", messageRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/api/otp", otpRouter);

// ✅ Default Routes
app.get("/", (req, res) => {
  res.send("Hello, World! Welcome to the Node.js server.");
});

app.get("/api", (req, res) => {
  res.json({ message: "This is an API response." });
});

// ✅ Create HTTP Server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

// ✅ Setup WebSocket
setupSocket(io);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
