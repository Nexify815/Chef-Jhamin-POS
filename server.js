require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { pool, dbRun, dbGet, dbAll, initDB } = require('./db');

if (!process.env.SECRET_KEY) {
    console.error('FATAL: SECRET_KEY environment variable is required. Set it in your .env file.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

// ================= HTTPS REDIRECT =================
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https' && !req.headers.host?.includes('localhost')) {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// ================= SECURITY HEADERS =================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// ================= RATE LIMITING =================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ================= CORS =================
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());

const reactBuildPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(reactBuildPath));

// ================= SECURITY MIDDLEWARE =================
const authenticateToken = (req, res, next) => {
    const headerToken = req.headers['authorization']?.split(' ')[1];
    const token = (headerToken && headerToken !== 'null' && headerToken !== 'undefined') ? headerToken : req.cookies.token;

    if (!token) return res.status(401).json({ success: false, message: "Access Denied" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(401).json({ success: false, message: "Invalid Token" });
        req.user = user;
        next();
    });
};

const requireRole = (role) => {
    return (req, res, next) => {
        const userRole = String(req.user?.role || '').trim().toLowerCase();
        const need = String(role || '').trim().toLowerCase();
        if (userRole && userRole === need) return next();
        return res.status(403).json({ success: false, message: `Access denied — ${need} privileges required. You are logged in as ${userRole || 'unknown'}.` });
    };
};

// ================= INPUT VALIDATION HELPERS =================
const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d);
};

const isPositiveNumber = (num) => {
    return typeof num === 'number' && num >= 0 && isFinite(num);
};

const sanitizeString = (str, maxLen = 255) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLen);
};

async function auditLog(action, tableName, recordId, recordSummary, oldValues, newValues, performedBy) {
    try {
        await dbRun(
            `INSERT INTO audit_log (action, table_name, record_id, record_summary, old_values, new_values, performed_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [action, tableName, recordId || null, recordSummary || null,
             oldValues ? JSON.stringify(oldValues) : null,
             newValues ? JSON.stringify(newValues) : null,
             performedBy || '']
        );
    } catch (e) {
        console.error('Audit log error:', e.message);
    }
}

// ================= AUTH ROUTES =================
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password, expectedRole } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
    }

    try {
        const user = await dbGet("SELECT * FROM users WHERE username = $1", [sanitizeString(username)]);
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const normalizedRole = String(user.role || '').trim().toLowerCase();

        if (expectedRole && normalizedRole !== expectedRole) {
            return res.status(403).json({ success: false, message: "Invalid credentials" });
        }

        const mustChangePassword = user.must_change_password === true || user.must_change_password === 1;

        const token = jwt.sign({ id: user.id, role: normalizedRole, name: user.fullname, mustChangePassword }, SECRET_KEY, { expiresIn: '12h' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 43200000 });

        const redirect = normalizedRole === 'owner' ? '/owner' : '/staff';
        res.json({ success: true, token, role: normalizedRole, redirect, fullname: user.fullname, mustChangePassword });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ================= CHANGE PASSWORD =================
app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new password required" });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }
    try {
        const user = await dbGet("SELECT * FROM users WHERE id = $1", [req.user.id]);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const isForced = user.must_change_password === true || user.must_change_password === 1;
        const isOwner = String(user.role || '').trim().toLowerCase() === 'owner';
        if (!isForced && !isOwner) {
            return res.status(403).json({ success: false, message: "Only the owner can change passwords" });
        }

        const validPass = await bcrypt.compare(currentPassword, user.password);
        if (!validPass) return res.status(401).json({ success: false, message: "Current password is incorrect" });
        const hash = await bcrypt.hash(newPassword, 10);
        await dbRun("UPDATE users SET password = $1, must_change_password = false WHERE id = $2", [hash, req.user.id]);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Owner can force any user to change password
app.post('/api/users/:id/force-password-reset', authenticateToken, requireRole('owner'), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await dbRun("UPDATE users SET must_change_password = true WHERE id = $1", [id]);
        res.json({ success: true, message: "User will be forced to change password on next login" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// ================= API ROUTES =================
app.use('/api', apiLimiter);

// --- USERS (OWNER) ---
app.get('/api/users', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const rows = await dbAll("SELECT id, username, role, fullname FROM users WHERE deleted = 0 ORDER BY role, fullname");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/list', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll("SELECT id, fullname, role FROM users WHERE deleted = 0 ORDER BY fullname");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateToken, requireRole('owner'), async (req, res) => {
    const { username, password, role, fullname } = req.body;

    if (!username || !password || !fullname) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await dbRun(
            "INSERT INTO users (username, password, role, fullname) VALUES ($1, $2, $3, $4) RETURNING id",
            [sanitizeString(username), hash, role || 'staff', sanitizeString(fullname)]
        );
        await auditLog('CREATE', 'users', result.rows[0].id, `Created user: ${sanitizeString(fullname)} (${role || 'staff'})`, null, { username, role: role || 'staff', fullname }, req.user?.name);
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        if (err.message && err.message.includes('unique')) {
            res.status(400).json({ success: false, message: "Username already exists" });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.put('/api/users/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const id = parseInt(req.params.id);
    const { username, password, role, fullname } = req.body;

    if (!username || !fullname || !role) {
        return res.status(400).json({ success: false, message: "Invalid user data" });
    }

    try {
        const old = await dbGet("SELECT * FROM users WHERE id = $1", [id]);
        if (password && password.trim().length > 0) {
            const hash = await bcrypt.hash(password, 10);
            await dbRun(
                `UPDATE users SET username=$1, password=$2, role=$3, fullname=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5`,
                [sanitizeString(username), hash, sanitizeString(role), sanitizeString(fullname), id]);
        } else {
            await dbRun("UPDATE users SET username=$1, role=$2, fullname=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4",
                [sanitizeString(username), sanitizeString(role), sanitizeString(fullname), id]);
        }
        await auditLog('UPDATE', 'users', id, `Updated user: ${sanitizeString(fullname)} (${sanitizeString(role)})`, old, { username, role, fullname }, req.user?.name);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/users/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    if (req.params.id == 1) {
        return res.status(400).json({ success: false, message: "Cannot delete primary admin" });
    }
    try {
        const old = await dbGet("SELECT * FROM users WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE users SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'users', req.params.id, `Deleted user: ${old?.fullname || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MENU ---
app.get('/api/menu', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM menu_items WHERE deleted = 0 ORDER BY category, name");
        res.json(rows.map(r => ({ ...r, sizes: JSON.parse(r.sizes) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/menu', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, sizes, category } = req.body;

    if (!name || !sizes || Object.keys(sizes).length === 0) {
        return res.status(400).json({ success: false, message: "Name and at least one price required" });
    }

    try {
        const result = await dbRun(
            "INSERT INTO menu_items (name, sizes, category) VALUES ($1, $2, $3) RETURNING id",
            [sanitizeString(name), JSON.stringify(sizes), category || 'Food']
        );
        await auditLog('CREATE', 'menu_items', result.rows[0].id, `Created menu item: ${sanitizeString(name)}`, null, { name, sizes, category }, req.user?.name);
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/menu/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, sizes, category } = req.body;

    if (!name || !sizes || Object.keys(sizes).length === 0) {
        return res.status(400).json({ success: false, message: "Name and prices required" });
    }

    try {
        const old = await dbGet("SELECT * FROM menu_items WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE menu_items SET name = $1, sizes = $2, category = $3, updated_at=CURRENT_TIMESTAMP WHERE id = $4",
            [sanitizeString(name), JSON.stringify(sizes), category || 'Food', req.params.id]);
        await auditLog('UPDATE', 'menu_items', req.params.id, `Updated menu item: ${sanitizeString(name)}`, old, { name, sizes, category }, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/menu/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM menu_items WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE menu_items SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'menu_items', req.params.id, `Deleted menu item: ${old?.name || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EXTRAS ---
app.get('/api/extras', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM extras WHERE deleted = 0 ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/extras', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, price } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: "Name and price required" });
    }

    try {
        const result = await dbRun(
            "INSERT INTO extras (name, price) VALUES ($1, $2) RETURNING id",
            [sanitizeString(name), parseFloat(price) || 0]
        );
        await auditLog('CREATE', 'extras', result.rows[0].id, `Created extra: ${sanitizeString(name)} - GHS ${parseFloat(price) || 0}`, null, { name, price }, req.user?.name);
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/extras/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, price } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: "Name and price required" });
    }

    try {
        const old = await dbGet("SELECT * FROM extras WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE extras SET name = $1, price = $2, updated_at=CURRENT_TIMESTAMP WHERE id = $3",
            [sanitizeString(name), parseFloat(price) || 0, req.params.id]);
        await auditLog('UPDATE', 'extras', req.params.id, `Updated extra: ${sanitizeString(name)} - GHS ${parseFloat(price) || 0}`, old, { name, price }, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/extras/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM extras WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE extras SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'extras', req.params.id, `Deleted extra: ${old?.name || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INGREDIENTS ---
app.get('/api/ingredients', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM ingredients WHERE deleted = 0 ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ingredients', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, unit, stock, reorder_level } = req.body;

    if (!name || !unit) {
        return res.status(400).json({ success: false, message: "Name and unit required" });
    }

    try {
        const result = await dbRun(
            "INSERT INTO ingredients (name, unit, stock, reorder_level) VALUES ($1, $2, $3, $4) RETURNING id",
            [sanitizeString(name), sanitizeString(unit), parseFloat(stock) || 0, parseFloat(reorder_level) || 5]
        );
        await auditLog('CREATE', 'ingredients', result.rows[0].id, `Created ingredient: ${sanitizeString(name)}`, null, { name, unit, stock, reorder_level }, req.user?.name);
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/ingredients/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, unit, stock, reorder_level } = req.body;

    if (!name || !unit) {
        return res.status(400).json({ success: false, message: "Name and unit required" });
    }

    try {
        const old = await dbGet("SELECT * FROM ingredients WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE ingredients SET name=$1, unit=$2, stock=$3, reorder_level=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
            [sanitizeString(name), sanitizeString(unit), parseFloat(stock) || 0, parseFloat(reorder_level) || 5, req.params.id]);
        await auditLog('UPDATE', 'ingredients', req.params.id, `Updated ingredient: ${sanitizeString(name)}`, old, { name, unit, stock, reorder_level }, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ingredients/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const id = req.params.id;
        const old = await dbGet("SELECT * FROM ingredients WHERE id = $1", [id]);
        await dbRun("UPDATE recipes SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE ingredient_id = $1", [id]);
        await dbRun("UPDATE ingredients SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [id]);
        await auditLog('DELETE', 'ingredients', id, `Deleted ingredient: ${old?.name || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inventory update (logged)
app.post('/api/inventory/update', authenticateToken, async (req, res) => {
    const { id, qty, type, notes } = req.body;

    if (!id || typeof qty !== 'number') {
        return res.status(400).json({ success: false, message: "Invalid inventory update data" });
    }

    const changeAmount = type === 'out' ? -Math.abs(qty) : Math.abs(qty);
    const date = new Date().toISOString().split('T')[0];

    try {
        await dbRun("BEGIN");
        await dbRun("UPDATE ingredients SET stock = stock + $1 WHERE id = $2", [changeAmount, id]);
        const row = await dbGet("SELECT * FROM ingredients WHERE id = $1", [id]);
        await dbRun(
            `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
            [date, id, changeAmount, type || 'Adjustment', row.stock, notes || '']
        );

        if (row && row.stock <= row.reorder_level) {
            const existing = await dbGet(
                "SELECT id FROM notifications WHERE ingredient_id = $1 AND is_read = 0",
                [id]
            );
            if (!existing) {
                await dbRun(
                    `INSERT INTO notifications (type, title, message, ingredient_id, current_stock, reorder_level)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        'low_stock',
                        'Low Stock Alert',
                        `${row.name} is low on stock (${row.stock} ${row.unit}). Reorder level: ${row.reorder_level} ${row.unit}.`,
                        id,
                        row.stock,
                        row.reorder_level
                    ]
                );
            } else {
                await dbRun(
                    "UPDATE notifications SET current_stock = $1, message = $2 WHERE id = $3",
                    [row.stock, `${row.name} is low on stock (${row.stock} ${row.unit}). Reorder level: ${row.reorder_level} ${row.unit}.`, existing.id]
                );
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true, newBalance: row.stock });
    } catch (err) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ error: err.message });
    }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll(
            "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await dbGet("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0");
        res.json({ count: result?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await dbRun("UPDATE notifications SET is_read = 1 WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await dbRun("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notifications/clear-all', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("DELETE FROM notifications");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notifications/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("DELETE FROM notifications WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECIPES ---
app.get('/api/recipes', authenticateToken, async (req, res) => {
    const sql = `
        SELECT r.id, m.name as item_name, m.id as menu_item_id, r.size, i.name as ingredient_name, i.id as ingredient_id, r.quantity_needed, i.unit
        FROM recipes r
        JOIN menu_items m ON r.menu_item_id = m.id
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.deleted = 0
        ORDER BY m.name, r.size
    `;
    try {
        const rows = await dbAll(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recipes', authenticateToken, requireRole('owner'), async (req, res) => {
    const { menu_item_id, size, ingredient_id, quantity_needed } = req.body;

    if (!menu_item_id || !size || !ingredient_id || !quantity_needed) {
        return res.status(400).json({ success: false, message: "All recipe fields required" });
    }

    try {
        const result = await dbRun(
            "INSERT INTO recipes (menu_item_id, size, ingredient_id, quantity_needed) VALUES ($1, $2, $3, $4) RETURNING id",
            [menu_item_id, size, ingredient_id, parseFloat(quantity_needed) || 0]
        );
        await auditLog('CREATE', 'recipes', result.rows[0].id, `Created recipe: item #${menu_item_id} (${size}) x ${quantity_needed}`, null, { menu_item_id, size, ingredient_id, quantity_needed }, req.user?.name);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/recipes/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { menu_item_id, size, ingredient_id, quantity_needed } = req.body;

    if (!menu_item_id || !size || !ingredient_id || !quantity_needed) {
        return res.status(400).json({ success: false, message: "All recipe fields required" });
    }

    try {
        const old = await dbGet("SELECT * FROM recipes WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE recipes SET menu_item_id=$1, size=$2, ingredient_id=$3, quantity_needed=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
            [menu_item_id, size, ingredient_id, parseFloat(quantity_needed) || 0, req.params.id]);
        await auditLog('UPDATE', 'recipes', req.params.id, `Updated recipe: item #${menu_item_id} (${size}) x ${quantity_needed}`, old, { menu_item_id, size, ingredient_id, quantity_needed }, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recipes/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM recipes WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE recipes SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'recipes', req.params.id, `Deleted recipe: item #${old?.menu_item_id || '?'} (${old?.size || '?'})`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SALES ---
app.post('/api/sales', authenticateToken, async (req, res) => {
    const { date, staff, item, size, qty, unitPrice, extraItem, extraCost, total, payment, customer_name, discount } = req.body;

    if (!item || !size || !payment) {
        return res.status(400).json({ success: false, message: "Item, size and payment required" });
    }
    if (!isPositiveNumber(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    const saleDate = isValidDate(date) ? date : new Date().toISOString().split('T')[0];

    try {
        await dbRun("BEGIN");

        await dbRun(
            `INSERT INTO sales (date, staff, item, size, qty, "unitPrice", "extraItem", "extraCost", total, payment, deleted, customer_name, discount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12)`,
            [saleDate, sanitizeString(staff), sanitizeString(item), size, qty, unitPrice || 0,
            sanitizeString(extraItem), extraCost || 0, total || 0, payment,
            sanitizeString(customer_name), parseFloat(discount) || 0]
        );

        const recipes = await dbAll(
            `SELECT r.ingredient_id, r.quantity_needed, i.stock
             FROM recipes r
             JOIN menu_items m ON r.menu_item_id = m.id
             JOIN ingredients i ON r.ingredient_id = i.id
             WHERE m.name = $1 AND r.size = $2`, [item, size]
        );

        if (recipes && recipes.length > 0) {
            for (const r of recipes) {
                const amountToDeduct = r.quantity_needed * qty;
                const newBalance = r.stock - amountToDeduct;
                await dbRun("UPDATE ingredients SET stock = $1 WHERE id = $2", [newBalance, r.ingredient_id]);
                await dbRun(
                    `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [saleDate, r.ingredient_id, -amountToDeduct, 'Sale Deduction', newBalance, `Sale: ${qty}x ${item}`]
                );
            }
        }

        await dbRun("COMMIT");
        await auditLog('CREATE', 'sales', null, `Created sale: ${sanitizeString(item)} ${size} x${qty} - GHS ${total || 0}`, null, { date: saleDate, staff, item, size, qty, total, payment }, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales', authenticateToken, async (req, res) => {
    const role = String(req.user?.role || '').trim().toLowerCase();
    const includeDeleted = (req.query.includeDeleted === '1' || req.query.showDeleted === 'true') && role === 'owner';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const dateFilter = req.query.date || null;
    let whereClause = includeDeleted ? "" : " WHERE deleted = 0";
    const params = [];
    if (dateFilter) {
        whereClause += whereClause ? " AND date = $1" : " WHERE date = $1";
        params.push(dateFilter);
    }
    const countSql = `SELECT COUNT(*) as count FROM sales${whereClause}`;
    params.push(limit, offset);

    try {
        const rows = await dbAll(`SELECT * FROM sales${whereClause} ORDER BY id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        const total = await dbGet(countSql, dateFilter ? [dateFilter] : []);
        res.json({ rows, total: total?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sales/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { date, staff, item, size, qty, unitPrice, extraItem, extraCost, total, payment, customer_name, discount } = req.body;

    if (!item || !size || !payment) {
        return res.status(400).json({ success: false, message: "Item, size and payment required" });
    }
    const qtyNum = parseInt(qty);
    if (!isPositiveNumber(qtyNum) || qtyNum < 1) {
        return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    const saleDate = isValidDate(date) ? date : new Date().toISOString().split('T')[0];

    try {
        const existing = await dbGet("SELECT * FROM sales WHERE id = $1", [id]);
        if (!existing) return res.status(404).json({ success: false, message: "Sale not found" });
        if (existing.deleted === 1) return res.status(400).json({ success: false, message: "Cannot edit a deleted sale" });

        // Ownership check: staff can only edit their own sales
        const role = String(req.user?.role || '').trim().toLowerCase();
        if (role === 'staff' && existing.staff !== req.user?.name) {
            return res.status(403).json({ success: false, message: "You can only edit your own sales" });
        }

        await dbRun("BEGIN");

        // Reverse old deduction
        const oldRecipes = await dbAll(
            `SELECT r.ingredient_id, r.quantity_needed
             FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id
             WHERE m.name = $1 AND r.size = $2`, [existing.item, existing.size]
        );

        for (const r of oldRecipes) {
            const amountToAddBack = (parseFloat(r.quantity_needed) || 0) * (parseInt(existing.qty) || 0);
            if (amountToAddBack !== 0) {
                await dbRun("UPDATE ingredients SET stock = stock + $1 WHERE id = $2", [amountToAddBack, r.ingredient_id]);
                const row = await dbGet("SELECT stock FROM ingredients WHERE id = $1", [r.ingredient_id]);
                await dbRun(
                    `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes, performed_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [saleDate, r.ingredient_id, amountToAddBack, 'Sale Edit Reversal', row?.stock ?? 0, `Reversal: sale edit #${id}`, req.user?.name || '']
                );
            }
        }

        // Update sale
        await dbRun(
            `UPDATE sales SET date=$1, staff=$2, item=$3, size=$4, qty=$5, "unitPrice"=$6, "extraItem"=$7, "extraCost"=$8, total=$9, payment=$10, customer_name=$11, discount=$12, updated_at=CURRENT_TIMESTAMP WHERE id=$13`,
            [saleDate, sanitizeString(staff), sanitizeString(item), size, qtyNum, parseFloat(unitPrice) || 0,
            sanitizeString(extraItem), parseFloat(extraCost) || 0, parseFloat(total) || 0, payment,
            sanitizeString(customer_name), parseFloat(discount) || 0, id]
        );

        // Apply new deduction
        const newRecipes = await dbAll(
            `SELECT r.ingredient_id, r.quantity_needed
             FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id
             WHERE m.name = $1 AND r.size = $2`, [item, size]
        );

        for (const r of newRecipes) {
            const amountToDeduct = (parseFloat(r.quantity_needed) || 0) * qtyNum;
            if (amountToDeduct !== 0) {
                await dbRun("UPDATE ingredients SET stock = stock - $1 WHERE id = $2", [amountToDeduct, r.ingredient_id]);
                const row = await dbGet("SELECT stock FROM ingredients WHERE id = $1", [r.ingredient_id]);
                await dbRun(
                    `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes, performed_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [saleDate, r.ingredient_id, -amountToDeduct, 'Sale Edit Deduction', row?.stock ?? 0, `Deduction: sale edit #${id}`, req.user?.name || '']
                );
            }
        }

        await dbRun("COMMIT");
        await auditLog('UPDATE', 'sales', id, `Updated sale: ${sanitizeString(item)} ${size} x${qtyNum} - GHS ${total || 0}`, existing, { date: saleDate, staff, item, size, qty: qtyNum, total, payment }, req.user?.name);
        res.json({ success: true });
    } catch (e) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/sales/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const existing = await dbGet("SELECT * FROM sales WHERE id = $1", [id]);
        if (!existing) return res.status(404).json({ success: false, message: "Sale not found" });
        if (existing.deleted === 1) return res.status(400).json({ success: false, message: "Sale already deleted" });

        // Ownership check: staff can only delete their own sales
        const role = String(req.user?.role || '').trim().toLowerCase();
        if (role === 'staff' && existing.staff !== req.user?.name) {
            return res.status(403).json({ success: false, message: "You can only delete your own sales" });
        }

        await dbRun("BEGIN");

        // Reverse inventory
        const recipes = await dbAll(
            `SELECT r.ingredient_id, r.quantity_needed
             FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id
             WHERE m.name = $1 AND r.size = $2`, [existing.item, existing.size]
        );

        const saleDate = existing.date || new Date().toISOString().split('T')[0];
        const qtyNum = parseInt(existing.qty) || 0;

        for (const r of recipes) {
            const amountToAddBack = (parseFloat(r.quantity_needed) || 0) * qtyNum;
            if (amountToAddBack !== 0) {
                await dbRun("UPDATE ingredients SET stock = stock + $1 WHERE id = $2", [amountToAddBack, r.ingredient_id]);
                const row = await dbGet("SELECT stock FROM ingredients WHERE id = $1", [r.ingredient_id]);
                await dbRun(
                    `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [saleDate, r.ingredient_id, amountToAddBack, 'Sale Deleted Reversal', row?.stock ?? 0, `Reversal: sale delete #${id}`]
                );
            }
        }

        await dbRun(
            "UPDATE sales SET deleted=1, deleted_at=CURRENT_TIMESTAMP, deleted_by=$1 WHERE id=$2",
            [sanitizeString(req.user?.name || 'Unknown'), id]
        );

        await dbRun("COMMIT");
        await auditLog('DELETE', 'sales', id, `Deleted sale: ${existing.item} ${existing.size} x${existing.qty} - GHS ${existing.total || 0}`, existing, null, req.user?.name);
        res.json({ success: true });
    } catch (e) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- EXPENSES ---
app.get('/api/expenses', authenticateToken, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    try {
        const rows = await dbAll("SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC LIMIT $1 OFFSET $2", [limit, offset]);
        const total = await dbGet("SELECT COUNT(*) as count FROM expenses WHERE deleted = 0");
        res.json({ rows, total: total?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
    const { date, category, amount, description, payment } = req.body;

    if (!category) {
        return res.status(400).json({ success: false, message: "Category required" });
    }
    const amountNum = parseFloat(amount);
    if (!isPositiveNumber(amountNum) || amountNum <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const expDate = isValidDate(date) ? date : new Date().toISOString().split('T')[0];

    try {
        const result = await dbRun(
            `INSERT INTO expenses (date, category, amount, description, payment) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [expDate, sanitizeString(category), amountNum, sanitizeString(description), payment || 'Cash']
        );
        const newId = result.rows[0].id;
        await auditLog('CREATE', 'expenses', newId, `Created expense: ${sanitizeString(category)} - GHS ${amountNum}`, null, { date: expDate, category, amount: amountNum, description, payment }, req.user?.name);
        res.json({ id: newId, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM expenses WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE expenses SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'expenses', req.params.id, `Deleted expense: ${old?.category || 'unknown'} - GHS ${old?.amount || 0}`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STAFF LOGS ---
app.post('/api/clockin', authenticateToken, async (req, res) => {
    const { name, shift, task } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: "Name required" });
    }

    const date = new Date().toISOString().split('T')[0];
    const timeIn = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    try {
        const existing = await dbGet(
            "SELECT * FROM staff_logs WHERE name = $1 AND date = $2 AND status = 'Open'", [name, date]
        );
        if (existing) return res.status(400).json({ success: false, message: "Already clocked in!" });

        await dbRun(
            `INSERT INTO staff_logs (date, name, shift, task, "timeIn", status) VALUES ($1, $2, $3, $4, $5, 'Open')`,
            [date, sanitizeString(name), shift || (new Date().getHours() < 14 ? 'Morning' : 'Evening'), task || 'General', timeIn]
        );
        res.json({ success: true, message: `Clocked in at ${timeIn}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clockout', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const timeOut = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (!name) {
        return res.status(400).json({ success: false, message: "Name required" });
    }

    try {
        const row = await dbGet(
            "SELECT * FROM staff_logs WHERE name = $1 AND date = $2 AND status = 'Open'", [name, date]
        );
        if (!row) return res.status(400).json({ success: false, message: "No active shift found" });

        const start = new Date(`${date}T${row.timeIn}`);
        const end = new Date(`${date}T${timeOut}`);
        let hours = (end - start) / (1000 * 60 * 60);
        if (hours < 0) hours = 0;

        await dbRun(
            `UPDATE staff_logs SET "timeOut" = $1, hours = $2, status = 'Closed' WHERE id = $3`,
            [timeOut, hours.toFixed(2), row.id]
        );
        res.json({ success: true, message: `Clocked out. Worked ${hours.toFixed(2)} hrs` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/clock-status', authenticateToken, async (req, res) => {
    const name = req.user?.name;
    if (!name) return res.json({ clockedIn: false });

    const date = new Date().toISOString().split('T')[0];
    try {
        const row = await dbGet(
            "SELECT * FROM staff_logs WHERE name = $1 AND date = $2 AND status = 'Open'", [name, date]
        );
        if (row) {
            res.json({ clockedIn: true, timeIn: row.timeIn, shift: row.shift, task: row.task });
        } else {
            const lastLog = await dbGet(
                "SELECT * FROM staff_logs WHERE name = $1 AND date = $2 AND status = 'Closed' ORDER BY id DESC LIMIT 1", [name, date]
            );
            res.json({ clockedIn: false, timeOut: lastLog?.timeOut || null, hours: lastLog?.hours || null });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/staff', authenticateToken, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    try {
        const rows = await dbAll("SELECT * FROM staff_logs WHERE deleted = 0 ORDER BY id DESC LIMIT $1 OFFSET $2", [limit, offset]);
        const total = await dbGet("SELECT COUNT(*) as count FROM staff_logs WHERE deleted = 0");
        res.json({ rows, total: total?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/staff/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM staff_logs WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE staff_logs SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id = $1", [req.params.id]);
        await auditLog('DELETE', 'staff_logs', req.params.id, `Deleted staff log: ${old?.name || 'unknown'} (${old?.date || ''})`, old, null, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REPORTS ---
app.get('/api/reports/dashboard', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    try {
        const sales = await dbGet(
            "SELECT SUM(total) as total, COUNT(*) as count FROM sales WHERE date = $1 AND deleted = 0", [today]
        ) || { total: 0, count: 0 };

        const expenses = await dbGet(
            "SELECT SUM(amount) as total FROM expenses WHERE date = $1", [today]
        ) || { total: 0 };

        const payments = await dbAll(
            "SELECT payment, SUM(total) as total FROM sales WHERE date = $1 AND deleted = 0 GROUP BY payment", [today]
        ) || [];

        const weekly = await dbGet(
            "SELECT SUM(total) as total FROM sales WHERE date >= (CURRENT_DATE - INTERVAL '6 days')::text AND deleted = 0"
        ) || { total: 0 };

        const lowStock = await dbGet(
            "SELECT COUNT(*) as count FROM ingredients WHERE stock <= reorder_level"
        ) || { count: 0 };

        const chartData = await dbAll(
            `SELECT date, SUM(total) as total FROM sales
             WHERE date >= (CURRENT_DATE - INTERVAL '6 days')::text AND deleted = 0
             GROUP BY date ORDER BY date`
        ) || [];

        const staffActivity = await dbAll(
            `SELECT name, shift, "timeIn", "timeOut", hours FROM staff_logs
             WHERE date = $1 ORDER BY name`, [today]
        ) || [];

        res.json({
            sales, expenses, payments, weekly, lowStock, chartData, staffActivity
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    const startDate = req.query.start;
    if (!startDate) {
        return res.status(400).json({ success: false, message: "Start date required" });
    }

    try {
        const salesResult = await dbGet(
            `SELECT SUM(total) as total FROM sales
             WHERE date >= $1 AND date < ($1::date + INTERVAL '7 days')::text AND deleted = 0`, [startDate]
        );
        const expensesResult = await dbGet(
            `SELECT SUM(amount) as total FROM expenses
             WHERE date >= $1 AND date < ($1::date + INTERVAL '7 days')::text`, [startDate]
        );

        res.json({ sales: salesResult?.total || 0, expenses: expensesResult?.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ---
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const row = await dbGet("SELECT data FROM settings LIMIT 1");
        res.json(JSON.parse(row ? row.data : '{}'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', authenticateToken, requireRole('owner'), async (req, res) => {
    const settingsStr = JSON.stringify(req.body);
    try {
        const old = await dbGet("SELECT data FROM settings LIMIT 1");
        const oldData = old ? JSON.parse(old.data) : {};
        await dbRun("UPDATE settings SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM settings LIMIT 1)", [settingsStr]);
        await auditLog('UPDATE', 'settings', 1, `Updated settings: ${Object.keys(req.body).join(', ')}`, oldData, req.body, req.user?.name);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- IMPORT DATA ---
app.post('/api/import', authenticateToken, requireRole('owner'), async (req, res) => {
    const { table, data } = req.body;

    if (table && data && Array.isArray(data)) {
        const colMap = {
            'sales': { table: 'sales', cols: ['date','staff','item','size','qty','"unitPrice"','"extraItem"','"extraCost"','total','payment','customer_name','discount','deleted'] },
            'expenses': { table: 'expenses', cols: ['date','category','amount','description','payment','deleted'] },
            'staff-logs': { table: 'staff_logs', cols: ['date','name','shift','task','"timeIn"','"timeOut"','hours','notes','deleted'] },
            'ingredients': { table: 'ingredients', cols: ['name','unit','stock','reorder_level','cost_per_unit','deleted'] },
            'menu-items': { table: 'menu_items', cols: ['name','sizes','category','available','deleted'] },
            'recipes': { table: 'recipes', cols: ['menu_item_id','size','ingredient_id','quantity_needed','deleted'] },
            'extras': { table: 'extras', cols: ['name','price','deleted'] },
            'suppliers': { table: 'suppliers', cols: ['name','phone','email','notes','deleted'] },
            'customers': { table: 'customers', cols: ['name','phone','email','address','deleted'] },
            'purchase-orders': { table: 'purchase_orders', cols: ['supplier_id','date','items','total','status','notes','deleted'] },
        };

        const mapping = colMap[table];
        if (!mapping) return res.status(400).json({ success: false, message: `Unknown table: ${table}` });

        try {
            await dbRun("BEGIN");
            for (const row of data) {
                const values = mapping.cols.map(c => {
                    const clean = c.replace(/"/g, '');
                    return row[clean] !== undefined ? row[clean] : (row[c] !== undefined ? row[c] : null);
                });
                const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                const colDefs = mapping.cols.join(', ');
                await dbRun(`INSERT INTO ${mapping.table} (${colDefs}) VALUES (${placeholders})`, values);
            }
            await dbRun("COMMIT");
            await auditLog('IMPORT', mapping.table, null, `Imported ${data.length} rows into ${mapping.table}`, null, { count: data.length }, req.user?.name);
            res.json({ success: true, message: `Imported ${data.length} rows into ${table}` });
        } catch (err) {
            try { await dbRun("ROLLBACK"); } catch (_) {}
            res.status(500).json({ success: false, message: err.message });
        }
        return;
    }

    // Legacy format: { sales: [...], expenses: [...], ... }
    const { sales, expenses, staff, inventory } = req.body;

    try {
        await dbRun("BEGIN");

        if (sales && Array.isArray(sales)) {
            await dbRun("DELETE FROM sales");
            for (const s of sales) {
                await dbRun(
                    `INSERT INTO sales (date, staff, item, size, qty, "unitPrice", "extraItem", "extraCost", total, payment, deleted)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)`,
                    [s.Date || s.date, s.Staff || s.staff || '', s.Item || s.item, s.Size || s.size,
                    s.Qty || s.qty || 1, s['Unit Price'] || s.unitPrice || 0,
                    s.Extras || s.extraItem || '', s['Extra Cost'] || s.extraCost || 0,
                    s.Total || s.total || 0, s.Payment || s.payment || 'Cash']
                );
            }
        }

        if (expenses && Array.isArray(expenses)) {
            await dbRun("DELETE FROM expenses");
            for (const e of expenses) {
                await dbRun(
                    `INSERT INTO expenses (date, category, amount, description, payment) VALUES ($1, $2, $3, $4, $5)`,
                    [e.Date || e.date, e.Category || e.category, e.Amount || e.amount || 0,
                    e.Description || e.description || '', e.Payment || e.payment || 'Cash']
                );
            }
        }

        if (staff && Array.isArray(staff)) {
            await dbRun("DELETE FROM staff_logs");
            for (const s of staff) {
                await dbRun(
                    `INSERT INTO staff_logs (date, name, shift, task, "timeIn", "timeOut", hours, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Closed')`,
                    [s.Date || s.date, s.Name || s.name, s.Shift || s.shift || 'Morning',
                    s.Task || s.task || 'General', s['Time In'] || s.timeIn || '',
                    s['Time Out'] || s.timeOut || '', s.Hours || s.hours || 0]
                );
            }
        }

        if (inventory && Array.isArray(inventory)) {
            for (const i of inventory) {
                const itemName = i.Item || i.name;
                const stock = i.Stock || i.stock || 0;
                await dbRun("UPDATE ingredients SET stock = $1 WHERE name = $2", [stock, itemName]);
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true, message: "Data imported successfully" });
    } catch (err) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- EDIT EXPENSE ---
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    const { date, category, amount, description, payment } = req.body;
    if (!category) return res.status(400).json({ success: false, message: "Category required" });
    const amountNum = parseFloat(amount);
    if (!isPositiveNumber(amountNum) || amountNum <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });
    const expDate = isValidDate(date) ? date : new Date().toISOString().split('T')[0];
    try {
        const old = await dbGet("SELECT * FROM expenses WHERE id=$1", [req.params.id]);
        await dbRun("UPDATE expenses SET date=$1, category=$2, amount=$3, description=$4, payment=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6",
            [expDate, sanitizeString(category), amountNum, sanitizeString(description), payment || 'Cash', req.params.id]);
        await auditLog('UPDATE', 'expenses', req.params.id, `Updated expense: ${sanitizeString(category)} - GHS ${amountNum}`, old, { date: expDate, category, amount: amountNum, description, payment }, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVENTORY AUDIT LOG (OWNER ONLY) ---
app.get('/api/inventory-logs', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        const offset = parseInt(req.query.offset) || 0;
        const rows = await dbAll(
            `SELECT il.*, i.name as ingredient_name, i.unit
             FROM inventory_logs il
             LEFT JOIN ingredients i ON il.ingredient_id = i.id
             ORDER BY il.id DESC LIMIT $1 OFFSET $2`, [limit, offset]
        );
        const total = await dbGet("SELECT COUNT(*) as count FROM inventory_logs");
        res.json({ rows, total: total?.count || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RESTORE DELETED SALE ---
app.put('/api/sales/:id/restore', authenticateToken, requireRole('owner'), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const existing = await dbGet("SELECT * FROM sales WHERE id = $1", [id]);
        if (!existing) return res.status(404).json({ success: false, message: "Sale not found" });
        if (existing.deleted !== 1) return res.status(400).json({ success: false, message: "Sale is not deleted" });

        await dbRun("BEGIN");

        // Re-apply inventory deductions
        const recipes = await dbAll(
            `SELECT r.ingredient_id, r.quantity_needed
             FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id
             WHERE m.name = $1 AND r.size = $2`, [existing.item, existing.size]
        );
        const saleDate = existing.date || new Date().toISOString().split('T')[0];
        const qtyNum = parseInt(existing.qty) || 0;
        for (const r of recipes) {
            const amountToDeduct = (parseFloat(r.quantity_needed) || 0) * qtyNum;
            if (amountToDeduct !== 0) {
                await dbRun("UPDATE ingredients SET stock = stock - $1 WHERE id = $2", [amountToDeduct, r.ingredient_id]);
                const row = await dbGet("SELECT stock FROM ingredients WHERE id = $1", [r.ingredient_id]);
                await dbRun(
                    `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes, performed_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [saleDate, r.ingredient_id, -amountToDeduct, 'Sale Restored Deduction', row?.stock ?? 0, `Sale restored #${id}`, req.user?.name || '']
                );
            }
        }

        await dbRun("UPDATE sales SET deleted=0, deleted_at=NULL, deleted_by=NULL WHERE id=$1", [id]);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- EDIT STAFF LOG ---
app.put('/api/staff/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { date, name, shift, timeIn, timeOut, hours } = req.body;
    try {
        const old = await dbGet("SELECT * FROM staff_logs WHERE id = $1", [req.params.id]);
        await dbRun(
            `UPDATE staff_logs SET date=$1, name=$2, shift=$3, "timeIn"=$4, "timeOut"=$5, hours=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7`,
            [date, sanitizeString(name), shift || 'Morning', timeIn || '', timeOut || '', parseFloat(hours) || 0, req.params.id]
        );
        await auditLog('UPDATE', 'staff_logs', req.params.id, `Updated staff log: ${sanitizeString(name)} (${shift || 'Morning'})`, old, { date, name, shift, timeIn, timeOut, hours }, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TOGGLE MENU AVAILABILITY ---
app.put('/api/menu/:id/toggle-available', authenticateToken, async (req, res) => {
    try {
        const row = await dbGet("SELECT available FROM menu_items WHERE id = $1", [req.params.id]);
        if (!row) return res.status(404).json({ success: false, message: "Item not found" });
        const newVal = row.available === 1 ? 0 : 1;
        await dbRun("UPDATE menu_items SET available = $1 WHERE id = $2", [newVal, req.params.id]);
        res.json({ success: true, available: newVal });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- COST TRACKING in weekly report ---
app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    const startDate = req.query.start;
    if (!startDate) return res.status(400).json({ success: false, message: "Start date required" });
    try {
        const salesResult = await dbGet(
            `SELECT SUM(total) as total FROM sales WHERE date >= $1 AND date < ($1::date + INTERVAL '7 days')::text AND deleted = 0`, [startDate]
        );
        const expensesResult = await dbGet(
            `SELECT SUM(amount) as total FROM expenses WHERE date >= $1 AND date < ($1::date + INTERVAL '7 days')::text`, [startDate]
        );
        // Food cost: sum of ingredient costs used in sales that week
        const costResult = await dbGet(
            `SELECT COALESCE(SUM(il.change_amount * -1 * i.cost_per_unit), 0) as total
             FROM inventory_logs il
             JOIN ingredients i ON il.ingredient_id = i.id
             WHERE il.date >= $1 AND il.date < ($1::date + INTERVAL '7 days')::text
             AND il.change_amount < 0`, [startDate]
        );
        res.json({
            sales: salesResult?.total || 0,
            expenses: expensesResult?.total || 0,
            foodCost: parseFloat(costResult?.total) || 0
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SUPPLIERS ---
app.get('/api/suppliers', authenticateToken, async (req, res) => {
    try { res.json(await dbAll("SELECT * FROM suppliers WHERE deleted = 0 ORDER BY name")); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/suppliers', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, phone, email, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name required" });
    try {
        const r = await dbRun("INSERT INTO suppliers (name, phone, email, notes) VALUES ($1,$2,$3,$4) RETURNING id",
            [sanitizeString(name), sanitizeString(phone), sanitizeString(email), sanitizeString(notes)]);
        await auditLog('CREATE', 'suppliers', r.rows[0].id, `Created supplier: ${sanitizeString(name)}`, null, { name, phone, email, notes }, req.user?.name);
        res.json({ id: r.rows[0].id, success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/suppliers/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { name, phone, email, notes } = req.body;
    try {
        const old = await dbGet("SELECT * FROM suppliers WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE suppliers SET name=$1, phone=$2, email=$3, notes=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
            [sanitizeString(name), sanitizeString(phone), sanitizeString(email), sanitizeString(notes), req.params.id]);
        await auditLog('UPDATE', 'suppliers', req.params.id, `Updated supplier: ${sanitizeString(name)}`, old, { name, phone, email, notes }, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/suppliers/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM suppliers WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE suppliers SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
        await auditLog('DELETE', 'suppliers', req.params.id, `Deleted supplier: ${old?.name || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CUSTOMERS ---
app.get('/api/customers', authenticateToken, async (req, res) => {
    try { res.json(await dbAll("SELECT * FROM customers WHERE deleted = 0 ORDER BY name")); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/customers', authenticateToken, async (req, res) => {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name required" });
    try {
        const r = await dbRun("INSERT INTO customers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING id",
            [sanitizeString(name), sanitizeString(phone), sanitizeString(email), sanitizeString(address)]);
        await auditLog('CREATE', 'customers', r.rows[0].id, `Created customer: ${sanitizeString(name)}`, null, { name, phone, email, address }, req.user?.name);
        res.json({ id: r.rows[0].id, success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    const { name, phone, email, address } = req.body;
    try {
        const old = await dbGet("SELECT * FROM customers WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
            [sanitizeString(name), sanitizeString(phone), sanitizeString(email), sanitizeString(address), req.params.id]);
        await auditLog('UPDATE', 'customers', req.params.id, `Updated customer: ${sanitizeString(name)}`, old, { name, phone, email, address }, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM customers WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE customers SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
        await auditLog('DELETE', 'customers', req.params.id, `Deleted customer: ${old?.name || 'unknown'}`, old, null, req.user?.name);
        res.json({ success: true });
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PURCHASE ORDERS ---
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll(
            `SELECT po.*, s.name as supplier_name FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.deleted = 0 ORDER BY po.id DESC`
        );
        res.json(rows.map(r => ({ ...r, items: r.items ? JSON.parse(r.items) : [] })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/purchase-orders', authenticateToken, requireRole('owner'), async (req, res) => {
    const { supplier_id, date, items, total, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: "Items required" });
    const poDate = isValidDate(date) ? date : new Date().toISOString().split('T')[0];
    try {
        const r = await dbRun(
            "INSERT INTO purchase_orders (supplier_id, date, items, total, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            [supplier_id || null, poDate, JSON.stringify(items), parseFloat(total) || 0, sanitizeString(notes)]
        );
        await auditLog('CREATE', 'purchase_orders', r.rows[0].id, `Created PO: ${items.length} items - GHS ${parseFloat(total) || 0}`, null, { supplier_id, date: poDate, items, total, notes }, req.user?.name);
        res.json({ id: r.rows[0].id, success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/purchase-orders/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    const { supplier_id, date, items, total, status, notes } = req.body;
    try {
        const old = await dbGet("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        await dbRun(
            "UPDATE purchase_orders SET supplier_id=$1, date=$2, items=$3, total=$4, status=$5, notes=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7",
            [supplier_id || null, date, JSON.stringify(items), parseFloat(total) || 0, status || 'Pending', sanitizeString(notes), req.params.id]
        );
        await auditLog('UPDATE', 'purchase_orders', req.params.id, `Updated PO: status=${status || 'Pending'} - GHS ${parseFloat(total) || 0}`, old, { supplier_id, date, items, total, status, notes }, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/purchase-orders/:id', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        const old = await dbGet("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        await dbRun("UPDATE purchase_orders SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id]);
        await auditLog('DELETE', 'purchase_orders', req.params.id, `Deleted PO: GHS ${old?.total || 0}`, old, null, req.user?.name);
        res.json({ success: true });
    }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SALES OWNERSHIP CHECK (add discount support to create/edit) ---
// (Ownership enforced in PUT /api/sales/:id below)

// ================= BULK DELETE =================
// --- SALES (special: soft-delete + inventory reversal + ownership check) ---
app.post('/api/sales/bulk-delete', authenticateToken, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array required' });
    }
    try {
        const role = String(req.user?.role || '').trim().toLowerCase();
        const deleterName = sanitizeString(req.user?.name || 'Unknown');
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

        const rows = await dbAll(`SELECT * FROM sales WHERE id IN (${placeholders}) AND deleted != 1`, ids);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No valid sales found' });
        }

        // Ownership check: staff can only delete their own sales
        const unauthorized = rows.filter(s => role === 'staff' && s.staff !== req.user?.name);
        if (unauthorized.length > 0) {
            return res.status(403).json({ success: false, message: `You can only delete your own sales (${unauthorized.length} rejected)` });
        }

        await dbRun("BEGIN");
        let deletedCount = 0;

        for (const sale of rows) {
            const saleDate = sale.date || new Date().toISOString().split('T')[0];
            const qtyNum = parseInt(sale.qty) || 0;

            // Reverse inventory
            const recipes = await dbAll(
                `SELECT r.ingredient_id, r.quantity_needed
                 FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id
                 WHERE m.name = $1 AND r.size = $2`, [sale.item, sale.size]
            );
            for (const r of recipes) {
                const amountToAddBack = (parseFloat(r.quantity_needed) || 0) * qtyNum;
                if (amountToAddBack !== 0) {
                    await dbRun("UPDATE ingredients SET stock = stock + $1 WHERE id = $2", [amountToAddBack, r.ingredient_id]);
                    const row = await dbGet("SELECT stock FROM ingredients WHERE id = $1", [r.ingredient_id]);
                    await dbRun(
                        `INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes, performed_by)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [saleDate, r.ingredient_id, amountToAddBack, 'Sale Deleted Reversal', row?.stock ?? 0, `Bulk reversal: sale #${sale.id}`, deleterName]
                    );
                }
            }

            // Soft-delete
            await dbRun(
                "UPDATE sales SET deleted=1, deleted_at=CURRENT_TIMESTAMP, deleted_by=$1 WHERE id=$2",
                [deleterName, sale.id]
            );
            deletedCount++;
        }

        await dbRun("COMMIT");
        res.json({ success: true, deleted: deletedCount });
    } catch (e) {
        try { await dbRun("ROLLBACK"); } catch (_) {}
        res.status(500).json({ success: false, message: e.message });
    }
});

const bulkDeleteRoutes = [
  { path: '/api/expenses/bulk-delete', table: 'expenses', auth: true },
  { path: '/api/expenses/bulk-delete', table: 'expenses', auth: true },
  { path: '/api/staff/bulk-delete', table: 'staff_logs', auth: true, role: 'owner' },
  { path: '/api/menu/bulk-delete', table: 'menu_items', auth: true, role: 'owner' },
  { path: '/api/extras/bulk-delete', table: 'extras', auth: true, role: 'owner' },
  { path: '/api/ingredients/bulk-delete', table: 'ingredients', auth: true, role: 'owner' },
  { path: '/api/recipes/bulk-delete', table: 'recipes', auth: true, role: 'owner' },
  { path: '/api/users/bulk-delete', table: 'users', auth: true, role: 'owner' },
  { path: '/api/suppliers/bulk-delete', table: 'suppliers', auth: true, role: 'owner' },
  { path: '/api/customers/bulk-delete', table: 'customers', auth: true },
  { path: '/api/purchase-orders/bulk-delete', table: 'purchase_orders', auth: true, role: 'owner' },
];

bulkDeleteRoutes.forEach(({ path, table, role }) => {
  const middlewares = [authenticateToken];
  if (role) middlewares.push(requireRole(role));
  app.post(path, ...middlewares, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array required' });
      }
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`UPDATE ${table} SET deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, ids);
      res.json({ success: true, deleted: ids.length });
    } catch (err) {
      console.error(`Bulk delete ${table} error:`, err);
      res.status(500).json({ error: 'Failed to delete' });
    }
  });
});

// --- DANGER ZONE ---
// Clear all sales
app.post('/api/danger/clear-sales', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("UPDATE sales SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await auditLog('DANGER_CLEAR', 'sales', null, 'All sales cleared', null, null, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clear all expenses
app.post('/api/danger/clear-expenses', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("UPDATE expenses SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await auditLog('DANGER_CLEAR', 'expenses', null, 'All expenses cleared', null, null, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clear all staff logs
app.post('/api/danger/clear-staff-logs', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("UPDATE staff_logs SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await auditLog('DANGER_CLEAR', 'staff_logs', null, 'All staff logs cleared', null, null, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Factory reset
app.post('/api/danger/factory-reset', authenticateToken, requireRole('owner'), async (req, res) => {
    try {
        await dbRun("UPDATE sales SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await dbRun("UPDATE expenses SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await dbRun("UPDATE staff_logs SET deleted=1, deleted_at=CURRENT_TIMESTAMP");
        await dbRun("DELETE FROM inventory_logs");
        await dbRun("DELETE FROM notifications");
        await auditLog('DANGER_FACTORY_RESET', null, null, 'Factory reset performed', null, null, req.user?.name);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- AUDIT LOG ---
app.get('/api/audit-log', authenticateToken, requireRole('owner'), async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { action, table_name, performed_by, search, from, to } = req.query;
    
    let where = [];
    let params = [];
    let idx = 1;
    
    if (action) { where.push(`action = $${idx++}`); params.push(action); }
    if (table_name) { where.push(`table_name = $${idx++}`); params.push(table_name); }
    if (performed_by) { where.push(`performed_by = $${idx++}`); params.push(performed_by); }
    if (search) { where.push(`(record_summary ILIKE $${idx} OR action ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (from) { where.push(`created_at >= $${idx++}`); params.push(from); }
    if (to) { where.push(`created_at <= $${idx++}`); params.push(to + ' 23:59:59'); }
    
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    
    try {
        const rows = await dbAll(`SELECT * FROM audit_log ${whereClause} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
        const total = await dbGet(`SELECT COUNT(*) as count FROM audit_log ${whereClause}`, params);
        res.json({ rows, total: total?.count || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- EXPORT DATA ---
app.get('/api/export/:type', authenticateToken, requireRole('owner'), async (req, res) => {
    const type = req.params.type;
    const validTypes = ['sales', 'expenses', 'staff', 'inventory', 'menu', 'recipes', 'extras', 'ingredients', 'suppliers', 'customers', 'purchase-orders', 'audit-log', 'full-backup'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid export type' });
    
    try {
        if (type === 'full-backup') {
            const [sales, expenses, staffLogs, ingredients, menuItems, recipes, extras, suppliers, customers, purchaseOrders, auditLog, inventoryLogs, settings, notifications] = await Promise.all([
                dbAll("SELECT * FROM sales WHERE deleted = 0 ORDER BY id DESC"),
                dbAll("SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC"),
                dbAll("SELECT * FROM staff_logs WHERE deleted = 0 ORDER BY id DESC"),
                dbAll("SELECT * FROM ingredients WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM menu_items WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM recipes WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM extras WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM suppliers WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM customers WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM purchase_orders WHERE deleted = 0 ORDER BY id"),
                dbAll("SELECT * FROM audit_log ORDER BY id DESC LIMIT 5000"),
                dbAll("SELECT * FROM inventory_logs ORDER BY id DESC"),
                dbGet("SELECT data FROM settings LIMIT 1"),
                dbAll("SELECT * FROM notifications ORDER BY id DESC"),
            ]);
            return res.json({
                backup: true,
                version: '1.0',
                exported_at: new Date().toISOString(),
                data: {
                    sales, expenses, staff_logs: staffLogs, ingredients, menu_items: menuItems,
                    recipes, extras, suppliers, customers, purchase_orders: purchaseOrders,
                    audit_log: auditLog, inventory_logs: inventoryLogs,
                    settings: settings ? JSON.parse(settings.data) : {},
                    notifications,
                },
            });
        }

        let rows;
        switch (type) {
            case 'sales': rows = await dbAll("SELECT * FROM sales WHERE deleted = 0 ORDER BY id DESC"); break;
            case 'expenses': rows = await dbAll("SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC"); break;
            case 'staff': rows = await dbAll("SELECT * FROM staff_logs WHERE deleted = 0 ORDER BY id DESC"); break;
            case 'inventory': rows = await dbAll("SELECT i.*, ilog.change_amount, ilog.type as log_type FROM ingredients i LEFT JOIN inventory_logs ilog ON i.id = ilog.ingredient_id WHERE i.deleted = 0 ORDER BY i.id"); break;
            case 'menu': rows = await dbAll("SELECT * FROM menu_items WHERE deleted = 0 ORDER BY id"); break;
            case 'recipes': rows = await dbAll(`SELECT r.*, m.name as menu_name FROM recipes r JOIN menu_items m ON r.menu_item_id = m.id WHERE r.deleted = 0 ORDER BY r.id`); break;
            case 'extras': rows = await dbAll("SELECT * FROM extras WHERE deleted = 0 ORDER BY id"); break;
            case 'ingredients': rows = await dbAll("SELECT * FROM ingredients WHERE deleted = 0 ORDER BY id"); break;
            case 'suppliers': rows = await dbAll("SELECT * FROM suppliers WHERE deleted = 0 ORDER BY id"); break;
            case 'customers': rows = await dbAll("SELECT * FROM customers WHERE deleted = 0 ORDER BY id"); break;
            case 'purchase-orders': rows = await dbAll("SELECT * FROM purchase_orders WHERE deleted = 0 ORDER BY id"); break;
            case 'audit-log': rows = await dbAll("SELECT * FROM audit_log ORDER BY id DESC LIMIT 1000"); break;
        }
        res.json(rows || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- IMPORT FULL BACKUP ---
app.post('/api/import/full-backup', authenticateToken, requireRole('owner'), async (req, res) => {
    const { backup, version, data } = req.body;
    if (!backup || !data) {
        return res.status(400).json({ success: false, message: 'Invalid backup file format' });
    }

    const tables = {
        sales: data.sales,
        expenses: data.expenses,
        staff_logs: data.staff_logs,
        ingredients: data.ingredients,
        menu_items: data.menu_items,
        recipes: data.recipes,
        extras: data.extras,
        suppliers: data.suppliers,
        customers: data.customers,
        purchase_orders: data.purchase_orders,
        inventory_logs: data.inventory_logs,
        audit_log: data.audit_log,
        notifications: data.notifications,
    };

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const allTables = ['recipes', 'inventory_logs', 'audit_log', 'sales', 'expenses', 'staff_logs', 'ingredients', 'menu_items', 'extras', 'suppliers', 'customers', 'purchase_orders', 'notifications'];

        // Delete all data in FK-safe order (single connection ensures transactional)
        for (const t of allTables) {
            if (tables[t] && Array.isArray(tables[t])) {
                await client.query(`DELETE FROM ${t}`);
            }
        }

        // Helper: insert with explicit ID
        const insertRow = async (table, cols, row) => {
            const vals = cols.map(c => {
                const raw = row[c] !== undefined ? row[c] : (row[c.replace(/"/g, '')] !== undefined ? row[c.replace(/"/g, '')] : null);
                return raw;
            });
            const ph = vals.map((_, i) => `$${i + 1}`).join(',');
            await client.query(
                `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(',')}`,
                vals
            );
        };

        // Insert parent tables first, then children
        if (tables.ingredients?.length) {
            for (const i of tables.ingredients) await insertRow('ingredients', ['id','name','unit','stock','reorder_level','cost_per_unit','deleted','deleted_at'], i);
        }
        if (tables.menu_items?.length) {
            for (const m of tables.menu_items) {
                await insertRow('menu_items', ['id','name','sizes','category','available','deleted','deleted_at'], { ...m, sizes: typeof m.sizes === 'string' ? m.sizes : JSON.stringify(m.sizes) });
            }
        }
        if (tables.recipes?.length) {
            for (const r of tables.recipes) await insertRow('recipes', ['id','menu_item_id','size','ingredient_id','quantity_needed','deleted','deleted_at'], r);
        }
        if (tables.sales?.length) {
            for (const s of tables.sales) await insertRow('sales', ['id','date','staff','item','size','qty','"unitPrice"','"extraItem"','"extraCost"','total','payment','customer_name','discount','refund','refund_reason','deleted','deleted_at','deleted_by'], s);
        }
        if (tables.expenses?.length) {
            for (const e of tables.expenses) await insertRow('expenses', ['id','date','category','amount','description','payment','deleted','deleted_at'], e);
        }
        if (tables.staff_logs?.length) {
            for (const s of tables.staff_logs) await insertRow('staff_logs', ['id','date','name','shift','task','"timeIn"','"timeOut"','hours','"closingCash"','"momoCheck"','notes','status','deleted','deleted_at'], s);
        }
        if (tables.extras?.length) {
            for (const e of tables.extras) await insertRow('extras', ['id','name','price','deleted','deleted_at'], e);
        }
        if (tables.suppliers?.length) {
            for (const s of tables.suppliers) await insertRow('suppliers', ['id','name','phone','email','notes','deleted','deleted_at'], s);
        }
        if (tables.customers?.length) {
            for (const c of tables.customers) await insertRow('customers', ['id','name','phone','email','address','deleted','deleted_at'], c);
        }
        if (tables.purchase_orders?.length) {
            for (const p of tables.purchase_orders) await insertRow('purchase_orders', ['id','supplier_id','date','items','total','status','notes','deleted','deleted_at'], p);
        }
        if (tables.inventory_logs?.length) {
            for (const l of tables.inventory_logs) await insertRow('inventory_logs', ['id','date','ingredient_id','change_amount','type','balance_after','notes','performed_by'], l);
        }
        if (tables.audit_log?.length) {
            for (const a of tables.audit_log) await insertRow('audit_log', ['id','action','table_name','record_id','record_summary','old_values','new_values','performed_by'], a);
        }
        if (tables.notifications?.length) {
            for (const n of tables.notifications) await insertRow('notifications', ['id','type','title','message','ingredient_id','current_stock','reorder_level','is_read'], n);
        }

        // Reset sequences to max(id) + 1 for each table
        for (const t of allTables) {
            const maxRes = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${t}`);
            const maxId = parseInt(maxRes.rows[0].max_id);
            if (maxId > 0) {
                const seqRes = await client.query(`SELECT pg_get_serial_sequence('${t}', 'id') as seq`);
                if (seqRes.rows[0].seq) {
                    await client.query(`SELECT setval('${seqRes.rows[0].seq}', (SELECT COALESCE(MAX(id), 0) + 1 FROM ${t}))`);
                }
            }
        }

        // Restore settings
        if (data.settings && typeof data.settings === 'object') {
            await client.query("UPDATE settings SET data = $1 WHERE id = (SELECT id FROM settings LIMIT 1)", [JSON.stringify(data.settings)]);
        }

        await client.query("COMMIT");
        client.release();
        await auditLog('IMPORT', 'full_backup', null, `Full backup restored (version: ${version || '1.0'})`, null, { restored_at: new Date().toISOString() }, req.user?.name);
        res.json({ success: true, message: 'Full backup restored successfully' });
    } catch (err) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        client.release();
        res.status(500).json({ success: false, message: err.message });
    }
});

// API 404 fallback
app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// All other routes -> React app (handles client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(reactBuildPath, 'index.html'));
});

// ================= START SERVER =================
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`  Chef Jhamin's Kitchen Management`);
        console.log(`  Running on http://localhost:${PORT}`);
        console.log(`========================================`);
        console.log(`  NOTE: Default users must change passwords on first login.`);
        console.log(`========================================\n`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
