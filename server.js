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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static('public'));

// Create db directory if it doesn't exist
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Add session middleware before your routes
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: dbDir,
        table: 'sessions'
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Create database directory if it doesn't exist
const dbDirectory = './database';
if (!fs.existsSync(dbDirectory)){
    fs.mkdirSync(dbDirectory);
}

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'db', 'fitclub.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to database successfully');
        
        // Create users table if it doesn't exist (only once)
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

// Function to get database connection
function getDb() {
    return db;
}

// Authentication middleware
const authenticateUser = (req, res, next) => {
    // Check if user is logged in via session
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user from database
    db.get('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            console.error('Auth error:', err);
            return res.status(401).json({ error: 'Authentication failed' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user to request object
        req.user = user;
        next();
    });
};

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
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
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
                
                console.log('Login successful for:', email);
                return res.json({ 
                    success: true,
                    message: 'Login successful',
                    redirect: '/dashboard.html'
                });
            } else {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }
        } catch (error) {
            console.error('Password comparison error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }
    });
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

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

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
    db.get(`
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as new_users_today,
            COUNT(*) as active_users
        FROM users
    `, [], (err, stats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(stats);
    });
});

// Test database connection route
app.get('/api/test-db', (req, res) => {
    db.get('SELECT 1', [], (err, row) => {
        if (err) {
            console.error('Database test failed:', err);
            return res.status(500).json({ error: 'Database connection failed' });
        }
        res.json({ message: 'Database connection successful', data: row });
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

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
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