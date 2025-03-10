const express = require('express');
const mongoose = require('mongoose');
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

const app = express();
dotenv.config();

const allowedOrigins = [
  "http://localhost:3000", // Allow local development
  "https://influencerlink-af410.firebaseapp.com" // Existing allowed origin
];
// Middleware
app.use(cors({
    origin: allowedOrigins,   
    methods: ["GET", "POST", "PATCH", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true, // Allow specific HTTP methods
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_DB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log(error));

// Routes
app.use("/api/pageowners", authRouter);
app.use("/api/messages", messageRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/api/otp", otpRouter);

// Default Route
app.get('/', (req, res) => {
    res.send('Hello, World! Welcome to 2 the Node.js server.');
});

// Sample API Route
app.get('/api', (req, res) => {
    res.json({ message: 'This is an API response.' });
});

// Create HTTP server for Socket.Ia
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Update with your client URL in production
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
    ],
    credentials: true,
  },
});
setupSocket(io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});