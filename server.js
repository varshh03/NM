const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------- MongoDB Connection --------------------
mongoose.connect("mongodb://localhost:27017/shorty", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// -------------------- Schemas --------------------
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
}));

const Url = mongoose.model("Url", new mongoose.Schema({
  longUrl: String,
  shortUrl: String,
  userId: String,
  createdAt: { type: Date, default: Date.now },
}));

const Contact = mongoose.model("Contact", new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
}));

// -------------------- Auth Routes --------------------
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.json({ message: "User registered!" });
  } catch (err) {
    res.json({ error: "Email already exists" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, "yourSuperSecretKey");
    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    res.json({ error: "Server error" });
  }
});

// -------------------- URL Shortening --------------------
app.post("/api/shorten", async (req, res) => {
  const { longUrl } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, "yourSuperSecretKey");
      userId = decoded.userId;
    } catch {
      return res.json({ error: "Invalid token" });
    }
  }

  const shortUrl = `https://short.ly/${shortid.generate()}`;
  await Url.create({ longUrl, shortUrl, userId });
  res.json({ shortUrl });
});

// -------------------- Contact Form --------------------
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await Contact.create({ name, email, message });
    res.json({ message: "Thanks for reaching out!" });
  } catch (err) {
    res.json({ error: "Failed to send message" });
  }
});

// -------------------- Start Server --------------------
app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
