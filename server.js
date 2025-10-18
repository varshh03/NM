const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// --- Configuration ---
const app = express();
const PORT = 3000;
// IMPORTANT: Change this to a secure, long, random key in production
const JWT_SECRET = 'your_strong_secret_key'; 
// IMPORTANT: Update this URI to your running MongoDB instance
const MONGODB_URI = 'mongodb://localhost:27017/event_scheduler_db'; 

// --- Middleware Setup ---
app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());


// --- Database Connection Function ---
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected successfully.');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Exit process on connection failure
        process.exit(1); 
    }
}


// --- Mongoose Schemas ---

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const UserModel = mongoose.model('User', UserSchema);

// Event Schema
const EventSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Storing date and time separately as requested by the frontend logic
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    time: { type: String, required: true }, // Format: HH:MM
    venue: { type: String, default: 'Online' },
    category: { type: String, default: 'Default' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});
const EventModel = mongoose.model('Event', EventSchema);


// --- Authentication Middleware ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Extract token from 'Bearer TOKEN'
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Access denied. Token missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token is invalid or expired
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        // Attach user info (id, email) to the request
        req.user = user; 
        next();
    });
}


// --- API Routes ---

// POST /auth/signup - Register a new user
app.post('/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Missing username, email, or password.' });
    }

    try {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await UserModel.create({
            username,
            email,
            password: hashedPassword,
        });

        console.log(`User registered: ${newUser.email}`);
        
        res.status(201).json({ 
            message: 'User successfully registered.', 
            user: { id: newUser._id, username: newUser.username, email: newUser.email } 
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

// POST /auth/login - Authenticate and issue JWT
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token using the MongoDB unique _id
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ 
            message: 'Login successful.',
            token,
            userId: user._id.toString(),
            username: user.username
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET /events - Fetch all events for the authenticated user
app.get('/events', authenticateToken, async (req, res) => {
    try {
        // Find events associated with the authenticated user's ID
        const userEvents = await EventModel.find({ userId: req.user.id }).sort({ date: 1, time: 1 });
        
        // Format for FullCalendar (combining date and time into 'start')
        const formattedEvents = userEvents.map(event => ({
            id: event._id, // Use MongoDB ID
            title: event.title,
            description: event.description,
            // FullCalendar expects an ISO string, which we construct from separate fields
            start: `${event.date}T${event.time}:00`, 
            end: `${event.date}T${event.time}:00`, // Simplify to same start/end for base data
            color: '#4A90E2', // Default color, can be dynamic
            // Include isAttending/isHosting if needed for filtering (mocked here)
            isAttending: true, 
            isHosting: true,
        }));
        
        res.json(formattedEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error fetching events.' });
    }
});

// POST /events - Create a new event
app.post('/events', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    // Note: The frontend sends 'start' (YYYY-MM-DDTHH:MM), we need to split it
    const { title, description, date, time, venue, category } = req.body; 

    if (!title || !date || !time) {
        return res.status(400).json({ message: 'Missing required event fields (title, date, time).' });
    }

    try {
        const newEvent = await EventModel.create({
            userId: userId, 
            title,
            description,
            date,
            time,
            venue: venue || 'Online',
            category: category || 'Default',
        });
        res.status(201).json({ message: 'Event created successfully.', event: newEvent });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Server error creating event.' });
    }
});

// PUT /events/:id - Update event (used for drag-and-drop or form update)
app.put('/events/:id', authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const updates = req.body;

        const updatedEvent = await EventModel.findOneAndUpdate(
            { _id: eventId, userId: userId }, // Find by ID and ensure ownership
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true } // Return the updated document
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found or you do not own this event.' });
        }

        res.json({ 
            message: 'Event updated successfully.', 
            event: updatedEvent
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Server error during update.' });
    }
});

// GET /events/:id - Fetch event details
app.get('/events/:id', authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        
        const event = await EventModel.findOne({ _id: eventId, userId: userId });

        if (!event) {
            return res.status(404).json({ message: 'Event not found or you do not own this event.' });
        }
        res.json(event);
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({ message: 'Server error fetching event details.' });
    }
});

// DELETE /events/:id - Delete event
app.delete('/events/:id', authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        
        const result = await EventModel.findOneAndDelete({ _id: eventId, userId: userId });

        if (!result) {
            return res.status(404).json({ message: 'Event not found or you do not own this event.' });
        }

        res.status(204).send(); // 204 No Content on successful deletion
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Server error during deletion.' });
    }
});


// --- Server Initialization ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\nEvent Scheduler API running on http://localhost:${PORT}`);
        console.log(`\n--- Installation Instructions ---`);
        console.log(`1. Ensure MongoDB is running (e.g., via 'mongod' or Docker).`);
        console.log(`2. In the 'server' directory, run:`);
        console.log(`   npm install express body-parser cors jsonwebtoken bcryptjs mongoose`);
        console.log(`3. Run the server with: node server.js`);
        console.log(`----------------------------------`);
    });
});