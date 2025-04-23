const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const dotenv = require("dotenv");
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const sharp = require('sharp');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create database directory if it doesn't exist
const dbDirectory = path.join(__dirname, 'db');
try {
    if (!fs.existsSync(dbDirectory)) {
        fs.mkdirSync(dbDirectory, { recursive: true });
        console.log('Database directory created:', dbDirectory);
    }
} catch (err) {
    console.error('Error creating database directory:', err);
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Initialize single SQLite database instance
const db = new sqlite3.Database(path.join(dbDirectory, 'fitclub.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    } else {
        console.log('Connected to database successfully');
        
        // Create users table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table ready');
            }
        });
    }
});

// Session middleware configuration
app.use(session({
    store: new SQLiteStore({
        dir: dbDirectory,
        db: 'sessions.db',
        table: 'sessions',
        ttl: 24 * 60 * 60 // 24 hours in seconds
    }),
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Session activity middleware
app.use((req, res, next) => {
    if (req.session) {
        req.session.lastActivity = Date.now();
        req.session.touch();
    }
    next();
});

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Function to get database connection
function getDb() {
    return db;
}

// Authentication middleware
const authenticateUser = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    db.get('SELECT id, email, name FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        req.user = user;
        next();
    });
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ 
            error: 'Not authorized',
            sessionExpired: true
        });
    }
    
    // Update last activity
    req.session.lastActivity = Date.now();
    next();
};

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    const { adminId, password } = req.body;
    
    if (adminId === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
        try {
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            req.session.isAdmin = true;
            req.session.adminId = adminId;
            req.session.lastActivity = Date.now();

            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            res.json({ 
                success: true,
                message: 'Admin login successful'
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Internal server error' 
            });
        }
    } else {
        res.status(401).json({ 
            success: false,
            error: 'Invalid credentials' 
        });
    }
});

// Admin check session endpoint
app.get('/api/admin/check-session', (req, res) => {
    if (!req.session) {
        return res.status(401).json({ 
            isAuthenticated: false,
            error: 'No session found',
            sessionExpired: true
        });
    }

    if (!req.session.isAdmin) {
        return res.status(401).json({ 
            isAuthenticated: false,
            error: 'Not authorized',
            sessionExpired: true
        });
    }

    // Check if session is expired
    const now = Date.now();
    const lastActivity = req.session.lastActivity || 0;
    const sessionAge = now - lastActivity;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
        req.session.destroy();
        return res.status(401).json({ 
            isAuthenticated: false,
            error: 'Session expired',
            sessionExpired: true
        });
    }

    // Update last activity
    req.session.lastActivity = now;
    req.session.touch();

    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ 
                isAuthenticated: false,
                error: 'Session error'
            });
        }
        res.json({ 
            isAuthenticated: true,
            lastActivity: req.session.lastActivity
        });
    });
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ 
                    success: false,
                    error: 'Logout failed'
                });
            }
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Signup API
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'All fields are required'
            });
        }

        // Check if email exists
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error occurred'
                });
            }

            if (row) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email already exists'
                });
            }

            try {
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert user
                db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                    [name, email, hashedPassword],
                    (err) => {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({
                                status: 'error',
                                message: 'Error creating user'
                            });
                        }

                        res.status(201).json({
                            status: 'success',
                            message: 'Registration successful',
                            redirect: '/login'
                        });
                    }
                );
            } catch (hashError) {
                console.error('Hashing error:', hashError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Error during password hashing'
                });
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred during registration'
        });
    }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        // Get user from database
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            try {
                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    // Set session information
                    req.session.userId = user.id;
                    req.session.userEmail = user.email;
                    
                    // Save session before sending response
                    req.session.save((err) => {
                        if (err) {
                            console.error('Session save error:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Internal server error'
                            });
                        }
                        
                        // Send response
                        return res.json({
                            success: true,
                            message: 'Login successful',
                            user: {
                                id: user.id,
                                email: user.email,
                                name: user.name
                            }
                        });
                    });
                } else {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid email or password'
                    });
                }
            } catch (bcryptError) {
                console.error('Password comparison error:', bcryptError);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Registration route for api/auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword],
            function(err) {
                if (err) {
                    console.error('Registration error:', err);
                    return res.status(500).json({
                        success: false,
                        message: err.message.includes('UNIQUE') 
                            ? 'Email already exists' 
                            : 'Error creating user'
                    });
                }

                // Set session for automatic login
                req.session.userId = this.lastID;
                req.session.userEmail = email;

                res.json({
                    success: true,
                    user: {
                        id: this.lastID,
                        email: email,
                        name: name
                    }
                });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Test user route
app.get('/api/test-user', async (req, res) => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    try {
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        
        db.run(
            'INSERT OR REPLACE INTO users (email, password, name) VALUES (?, ?, ?)',
            [testEmail, hashedPassword, 'Test User'],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ 
                    message: 'Test user created', 
                    email: testEmail, 
                    password: testPassword 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Auth check route
app.get('/api/auth/check', authenticateUser, (req, res) => {
    res.json({ 
        authenticated: true, 
        user: req.user 
    });
});

// User profile route
app.get('/api/user/profile', authenticateUser, (req, res) => {
    db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        res.json(user);
    });
});

// Get profile details
app.get('/api/user/profile', authenticateUser, (req, res) => {
    db.get(`
        SELECT 
            u.id, u.email, u.created_at,
            p.name, p.age, p.weight, p.height, p.goals, 
            p.profile_picture
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
    `, [req.user.id], (err, profile) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        
        if (profile && profile.profile_picture) {
            // Convert BLOB to base64 for sending to client
            profile.profile_picture = `data:image/jpeg;base64,${profile.profile_picture.toString('base64')}`;
        }
        
        res.json(profile);
    });
});

// Update profile
app.post('/api/user/profile', authenticateUser, async (req, res) => {
    try {
        const { name, age, weight, height, goals } = req.body;
        
        // Validate input
        if (!name || !age || !weight || !height) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }

        // Update or insert profile
        db.run(`
            INSERT INTO profiles (
                user_id, name, age, weight, height, goals, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                age = excluded.age,
                weight = excluded.weight,
                height = excluded.height,
                goals = excluded.goals,
                updated_at = CURRENT_TIMESTAMP
        `, [
            req.user.id, name, age, weight, height, goals
        ], function(err) {
            if (err) {
                console.error('Error updating profile:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            // Fetch and return updated profile
            db.get(`
                SELECT 
                    u.id, u.email,
                    p.name, p.age, p.weight, p.height, p.goals,
                    p.profile_picture, p.updated_at
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.id = ?
            `, [req.user.id], (err, profile) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch updated profile' });
                }

                if (profile && profile.profile_picture) {
                    profile.profile_picture = `data:image/jpeg;base64,${profile.profile_picture.toString('base64')}`;
                }

                res.json(profile);
            });
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to process profile update' });
    }
});

// Get profile
app.get('/api/user/profile', authenticateUser, (req, res) => {
    db.get(`
        SELECT 
            u.id, u.email,
            p.name, p.age, p.weight, p.height, p.goals,
            p.profile_picture, p.updated_at
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
    `, [req.user.id], (err, profile) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        
        if (profile && profile.profile_picture) {
            profile.profile_picture = `data:image/jpeg;base64,${profile.profile_picture.toString('base64')}`;
        }
        
        res.json(profile || { id: req.user.id, email: req.user.email });
    });
});

// Upload profile picture
app.post('/api/user/profile-image', authenticateUser, upload.single('profileImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    try {
        // Process image
        const processedImage = await sharp(req.file.buffer)
            .resize(300, 300, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Update profile picture
        db.run(`
            UPDATE profiles 
            SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [processedImage, req.user.id], function(err) {
            if (err) {
                console.error('Error updating profile picture:', err);
                return res.status(500).json({ error: 'Failed to update profile picture' });
            }

            res.json({ 
                success: true,
                profile_picture: `data:image/jpeg;base64,${processedImage.toString('base64')}`
            });
        });
    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({ error: 'Failed to process profile picture' });
    }
});

// Dashboard routes

// Admin page route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API route to get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API route to delete a user
app.delete('/api/users/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM users WHERE id = ?', id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "User deleted", changes: this.changes });
    });
});

// API route to get user statistics
app.get('/api/stats', (req, res) => {
    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now')) as new_users_today,
            (SELECT COUNT(*) FROM users WHERE last_login >= datetime('now', '-1 day')) as active_users
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows[0]);
    });
});

// Test endpoint to check database connection
app.get('/api/test-db', (req, res) => {
    db.get('SELECT 1', (err, result) => {
        if (err) {
            console.error('Database test error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database connection failed',
                error: err.message
            });
        }
        res.json({
            success: true,
            message: 'Database connection successful',
            result
        });
    });
});

// Simple registration route
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (email, password) VALUES (?, ?)', 
            [email, hashedPassword], 
            (err) => {
                if (err) {
                    return res.status(500).json({ status: 'error', message: 'Registration failed' });
                }
                res.json({ status: 'success', message: 'Registration successful' });
            }
        );
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Registration failed' });
    }
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configure Gemini API
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Chatbot API Endpoint
    app.post("/chat", async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ reply: "I didn't understand that. Can you rephrase?" });
        }

        console.log(`User: ${message}`);

        try {
            const result = await model.generateContent(message);
            const aiReply = result.response.text() || "Sorry, I couldn't fetch a response.";
            console.log(`AI: ${aiReply}`);
            res.json({ reply: aiReply });

        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ reply: "Error: Unable to connect to Gemini API" });
        }
    });
} else {
    console.warn("GEMINI_API_KEY not found in environment variables. Chat functionality will not work.");
}

// Progress data route
app.get('/api/progress/:metric', authenticateUser, (req, res) => {
    const { metric } = req.params;
    const startDate = req.query.start;
    
    // Sample data - replace with actual database query
    const sampleData = {
        weight: [75, 74.5, 74.2, 74.0, 73.8, 73.5, 73.2],
        steps: [8000, 8500, 9000, 8200, 8800, 9200, 8900],
        calories: [400, 450, 420, 380, 460, 440, 420],
        water: [2.1, 2.3, 2.0, 2.2, 2.4, 2.1, 2.3]
    };

    res.json({
        values: sampleData[metric] || Array(7).fill(null)
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
