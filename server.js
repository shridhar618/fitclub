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
                
                // Add a test user (password: test123)
                const testEmail = 'test@test.com';
                bcrypt.hash('test123', 10, (err, hash) => {
                    if (err) {
                        console.error('Error creating test user:', err);
                        return;
                    }
                    db.run(`
                        INSERT OR REPLACE INTO users (email, password, name) 
                        VALUES (?, ?, ?)
                    `, [testEmail, hash, 'Test User'], (err) => {
                        if (err) {
                            console.error('Error inserting test user:', err);
                        } else {
                            console.log('Test user created successfully');
                        }
                    });
                });
            }
        });
    }
});

// Session middleware configuration
app.use(session({
    store: new SQLiteStore({
        dir: dbDirectory,
        db: 'sessions.db',
        table: 'sessions'
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
        maxAge: 30 * 60 * 1000 // 30 minutes
    }
}));

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Session activity middleware
app.use((req, res, next) => {
    if (req.session) {
        if (req.session.lastActivity && 
            Date.now() - req.session.lastActivity > (30 * 60 * 1000)) { // 30 minutes
            return req.session.destroy(() => {
                res.status(401).json({ 
                    error: 'Session expired',
                    sessionExpired: true 
                });
            });
        }
        req.session.lastActivity = Date.now();
    }
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
    console.log('Session check:', {
        sessionId: req.sessionID,
        session: req.session
    });

    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ 
            isAuthenticated: false,
            error: 'Session expired or invalid',
            sessionExpired: true
        });
    }

    // Update last activity
    req.session.lastActivity = Date.now();
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ 
                isAuthenticated: false,
                error: 'Session error'
            });
        }
        res.json({ isAuthenticated: true });
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

// Dashboard routes
app.get('/dashboard', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin page route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API route to get all users
app.get('/api/users', authenticateAdmin, (req, res) => {
    db.all('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API route to delete a user
app.delete('/api/users/:id', authenticateAdmin, (req, res) => {
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
app.get('/api/stats', authenticateAdmin, (req, res) => {
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
