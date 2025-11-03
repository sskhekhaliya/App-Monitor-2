const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Config ---
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = 'dashboardDB';

// --- JWT Config ---
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only';
const TOKEN_EXPIRY = '1d';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let db;
let usersCollection;

// --- Helper: Check App Health ---
const checkApplicationHealth = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.status === 200 ? 'up' : 'down';
  } catch {
    return 'down';
  }
};

const checkBulkHealth = async (applications) =>
  Promise.all(
    applications.map(async (app) => {
      app.status = app.prodUrl
        ? await checkApplicationHealth(app.prodUrl)
        : 'down';
      return app;
    })
  );

// --- Multer Setup for Profile Uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) =>
    cb(null, req.user.id + '-' + Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb('Error: Only images (JPEG/PNG/GIF) are allowed!');
  },
});

// --- JWT Auth Middleware ---
function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token.' });
}

// --- Start Server ---
async function startServer() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    db = client.db(dbName);
    usersCollection = db.collection('users');

    // ---------------- AUTH ROUTES ----------------

    app.post('/api/auth/signup', async (req, res) => {
      try {
        const { username, password, firstName, lastName } = req.body;
        if (!username || !password || !firstName || !lastName)
          return res.status(400).json({ message: 'Please enter all fields.' });

        const userExists = await usersCollection.findOne({ username });
        if (userExists)
          return res.status(400).json({ message: 'User already exists.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await usersCollection.insertOne({
          username,
          password: hashedPassword,
          firstName,
          lastName,
        });

        res.status(201).json({ message: 'User created successfully!' });
      } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ message: 'Server error during signup.' });
      }
    });

    app.post('/api/auth/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        const user = await usersCollection.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

        const token = jwt.sign(
          { id: user._id.toString(), username: user.username },
          JWT_SECRET,
          { expiresIn: TOKEN_EXPIRY }
        );

        res.json({
          token,
          user: {
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            profilePicUrl: user.profilePicUrl || null,
          },
        });
      } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server error during login.' });
      }
    });

    // ---------------- APPLICATION ROUTES ----------------

    app.get('/api/applications', protect, async (req, res) => {
      try {
        const apps = await db.collection('applications').find({}).toArray();
        const withStatus = await checkBulkHealth(apps);
        res.json(withStatus);
      } catch (err) {
        res.status(500).json({ message: 'Error fetching applications' });
      }
    });

    app.post('/api/applications', protect, async (req, res) => {
      try {
        const newApp = req.body;
        newApp.status = await checkApplicationHealth(newApp.prodUrl);
        const result = await db.collection('applications').insertOne(newApp);
        res.status(201).json({ _id: result.insertedId, message: 'Added successfully' });
      } catch (err) {
        res.status(500).json({ message: 'Error adding application' });
      }
    });

    // ---------------- USER ROUTES ----------------

    // ✅ Primary Route
    app.get('/api/users/me', protect, async (req, res) => {
      try {
        const user = await usersCollection.findOne(
          { _id: new ObjectId(req.user.id) },
          { projection: { password: 0 } }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
      } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Server error fetching user data.' });
      }
    });

    // ✅ Alias route (singular)
    app.get('/api/user/me', protect, async (req, res) => {
      try {
        const user = await usersCollection.findOne(
          { _id: new ObjectId(req.user.id) },
          { projection: { password: 0 } }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
      } catch (err) {
        console.error('Error fetching user (alias):', err);
        res.status(500).json({ message: 'Server error fetching user data.' });
      }
    });

    // Update profile names
    app.put('/api/users/profile', protect, async (req, res) => {
      try {
        const { firstName, lastName } = req.body;
        if (!firstName || !lastName)
          return res.status(400).json({ message: 'Both names required.' });

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          { $set: { firstName, lastName } }
        );
        if (!result.matchedCount)
          return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({ message: 'Profile updated!', firstName, lastName });
      } catch (err) {
        res.status(500).json({ message: 'Error updating profile.' });
      }
    });

    // Change password
    app.put('/api/users/password', protect, async (req, res) => {
      try {
        const { oldPassword, newPassword } = req.body;
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(400).json({ message: 'Incorrect old password.' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          { $set: { password: hashed } }
        );
        res.json({ message: 'Password changed successfully.' });
      } catch (err) {
        res.status(500).json({ message: 'Error changing password.' });
      }
    });

    // Upload profile picture
    app.put('/api/users/profile-picture', protect, upload.single('profilePic'), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

        const profilePicUrl = `uploads/${req.file.filename}`;
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          { $set: { profilePicUrl } }
        );
        res.json({ message: 'Profile picture updated!', profilePicUrl });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Error uploading profile picture.' });
      }
    });

    // ---------------- START ----------------
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

startServer();
