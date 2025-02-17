const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Create database directory if it doesn't exist
const dbDirectory = './database';
if (!fs.existsSync(dbDirectory)){
    fs.mkdirSync(dbDirectory);
}

// Database connection
const db = new sqlite3.Database('./database/fitclub.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to SQLite database');
    initializeDatabase();
});

// Initialize database tables
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }
        console.log('Database tables initialized');
    });
}

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

// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Email and password are required'
        });
    }

    // Check user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Database error occurred'
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password'
            });
        }

        try {
            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Remove password from user object
            delete user.password;

            res.json({
                status: 'success',
                message: 'Login successful',
                user: user,
                redirect: '/index.html'
            });
        } catch (error) {
            console.error('Password comparison error:', error);
            res.status(500).json({
                status: 'error',
                message: 'An error occurred during login'
            });
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
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


// Dashboard API
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin page route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API route to get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
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
    const today = new Date().toISOString().split('T')[0];
    
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

