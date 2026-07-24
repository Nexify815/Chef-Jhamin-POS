const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const dbRun = async (sql, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return {
            lastID: result.rows[0]?.id || result.rowCount,
            changes: result.rowCount,
            rows: result.rows,
        };
    } finally {
        client.release();
    }
};

const dbGet = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
};

const dbAll = async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows;
};

async function initDB() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                fullname TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                name TEXT,
                sizes TEXT,
                category TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ingredients (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE,
                unit TEXT,
                stock REAL DEFAULT 0,
                reorder_level REAL DEFAULT 5,
                cost_per_unit REAL DEFAULT 0
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS recipes (
                id SERIAL PRIMARY KEY,
                menu_item_id INTEGER,
                size TEXT,
                ingredient_id INTEGER,
                quantity_needed REAL,
                FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
                FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS extras (
                id SERIAL PRIMARY KEY,
                name TEXT,
                price REAL
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                date TEXT,
                staff TEXT,
                item TEXT,
                size TEXT,
                qty INTEGER,
                "unitPrice" REAL,
                "extraItem" TEXT,
                "extraCost" REAL,
                total REAL,
                payment TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted INTEGER DEFAULT 0,
                deleted_at TEXT,
                deleted_by TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                date TEXT,
                category TEXT,
                amount REAL,
                description TEXT,
                payment TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS staff_logs (
                id SERIAL PRIMARY KEY,
                date TEXT,
                name TEXT,
                shift TEXT,
                task TEXT,
                "timeIn" TEXT,
                "timeOut" TEXT,
                hours REAL,
                "closingCash" REAL,
                "momoCheck" TEXT,
                notes TEXT,
                status TEXT DEFAULT 'Closed'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory_logs (
                id SERIAL PRIMARY KEY,
                date TEXT,
                ingredient_id INTEGER,
                change_amount REAL,
                type TEXT,
                balance_after REAL,
                notes TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                data TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                type TEXT,
                title TEXT,
                message TEXT,
                ingredient_id INTEGER,
                current_stock REAL,
                reorder_level REAL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Ensure soft-delete columns exist on older DBs
        const salesCols = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'sales'"
        );
        const colNames = new Set(salesCols.rows.map(c => c.column_name));
        if (!colNames.has('deleted')) await client.query("ALTER TABLE sales ADD COLUMN deleted INTEGER DEFAULT 0");
        if (!colNames.has('deleted_at')) await client.query("ALTER TABLE sales ADD COLUMN deleted_at TEXT");
        if (!colNames.has('deleted_by')) await client.query("ALTER TABLE sales ADD COLUMN deleted_by TEXT");

        // Add new sales columns if missing
        if (!colNames.has('customer_name')) await client.query("ALTER TABLE sales ADD COLUMN customer_name TEXT");
        if (!colNames.has('discount')) await client.query("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0");
        if (!colNames.has('refund')) await client.query("ALTER TABLE sales ADD COLUMN refund INTEGER DEFAULT 0");
        if (!colNames.has('refund_reason')) await client.query("ALTER TABLE sales ADD COLUMN refund_reason TEXT");

        // Add available column to menu_items if missing
        const menuCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_items'");
        const menuColNames = new Set(menuCols.rows.map(c => c.column_name));
        if (!menuColNames.has('available')) await client.query("ALTER TABLE menu_items ADD COLUMN available INTEGER DEFAULT 1");

        // Add performed_by column to inventory_logs if missing
        const invLogCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_logs'");
        const invLogColNames = new Set(invLogCols.rows.map(c => c.column_name));
        if (!invLogColNames.has('performed_by')) await client.query("ALTER TABLE inventory_logs ADD COLUMN performed_by TEXT");

        // Seed default data
        const userCount = await client.query("SELECT count(*) as count FROM users");
        if (parseInt(userCount.rows[0].count) === 0) {
            const bcrypt = require('bcryptjs');
            const hashAdmin = await bcrypt.hash('admin123', 10);
            const hashStaff = await bcrypt.hash('staff123', 10);
            await client.query(
                "INSERT INTO users (username, password, role, fullname) VALUES ($1, $2, $3, $4)",
                ['admin', hashAdmin, 'owner', 'Chef Jhamin']
            );
            await client.query(
                "INSERT INTO users (username, password, role, fullname) VALUES ($1, $2, $3, $4)",
                ['staff', hashStaff, 'staff', 'General Staff']
            );
            console.log('✓ Default users created with hashed passwords');
        }

        const ingCount = await client.query("SELECT count(*) as count FROM ingredients");
        if (parseInt(ingCount.rows[0].count) === 0) {
            const ings = [
                ['Rice', 'Bags', 10, 2], ['Oil', 'Gallons', 5, 2],
                ['Chicken', 'Cartons', 10, 3], ['Sausage', 'Cartons', 5, 2],
                ['Spaghetti', 'Boxes', 20, 5], ['Charcoal', 'Bags', 10, 2],
                ['Packaging Bowls', 'Packs', 50, 10], ['Noodles', 'Boxes', 15, 3]
            ];
            for (const i of ings) {
                await client.query(
                    "INSERT INTO ingredients (name, unit, stock, reorder_level) VALUES ($1, $2, $3, $4)", i
                );
            }
            console.log('✓ Default ingredients created');
        }

        const extCount = await client.query("SELECT count(*) as count FROM extras");
        if (parseInt(extCount.rows[0].count) === 0) {
            const extras = [['Sausage', 2], ['Egg', 1], ['Plantain', 1.5], ['Rice', 3], ['Salad', 2]];
            for (const e of extras) {
                await client.query("INSERT INTO extras (name, price) VALUES ($1, $2)", e);
            }
            console.log('✓ Default extras created');
        }

        const menuCount = await client.query("SELECT count(*) as count FROM menu_items");
        if (parseInt(menuCount.rows[0].count) === 0) {
            const items = [
                { name: "Waakye", sizes: { Small: 5, Big: 8 }, category: "Food" },
                { name: "Jollof & Chicken", sizes: { Small: 6, Big: 10 }, category: "Food" },
                { name: "Fried Rice & Chicken", sizes: { Small: 6, Big: 10 }, category: "Food" },
                { name: "Peppered Goat Rice", sizes: { Small: 7, Big: 12 }, category: "Food" },
                { name: "Assorted Jollof", sizes: { Small: 7, Big: 12 }, category: "Food" },
                { name: "Assorted Fried Rice", sizes: { Small: 7, Big: 12 }, category: "Food" },
                { name: "Noodles", sizes: { Small: 4, Big: 6 }, category: "Food" },
                { name: "Spaghetti", sizes: { Small: 4.5, Big: 7 }, category: "Food" },
                { name: "Loaded Fries", sizes: { Small: 3.5, Big: 5.5 }, category: "Food" },
                { name: "Juice", sizes: { Small: 1.5, Big: 2.5 }, category: "Drink" }
            ];
            for (const item of items) {
                await client.query(
                    "INSERT INTO menu_items (name, sizes, category) VALUES ($1, $2, $3)",
                    [item.name, JSON.stringify(item.sizes), item.category]
                );
            }
            console.log('✓ Default menu items created');
        }

        const settingsCount = await client.query("SELECT count(*) as count FROM settings");
        if (parseInt(settingsCount.rows[0].count) === 0) {
            const defaultSettings = JSON.stringify({
                businessName: "Chef Jhamin's Kitchen",
                weeklyTarget: 21000,
                expenseLimit: 6300,
                dailyTarget: 3000
            });
            await client.query("INSERT INTO settings (data) VALUES ($1)", [defaultSettings]);
            console.log('✓ Default settings created');
        }

        // Create new tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name TEXT,
                phone TEXT,
                email TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER,
                date TEXT,
                items TEXT,
                total REAL DEFAULT 0,
                status TEXT DEFAULT 'Pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                table_name TEXT,
                record_id INTEGER,
                record_summary TEXT,
                old_values TEXT,
                new_values TEXT,
                performed_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add timestamps to tables missing them
        const addColIfMissing = async (table, col, def) => {
            const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [table]);
            if (!cols.rows.find(c => c.column_name === col)) {
                await client.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
            }
        };

        await addColIfMissing('users', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('users', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('menu_items', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('menu_items', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('ingredients', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('ingredients', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('recipes', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('recipes', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('extras', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('extras', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('expenses', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('staff_logs', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('staff_logs', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('inventory_logs', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('settings', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('suppliers', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('customers', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await addColIfMissing('purchase_orders', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

        // Add soft delete to all tables
        await addColIfMissing('expenses', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('expenses', 'deleted_at', "TEXT");
        await addColIfMissing('staff_logs', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('staff_logs', 'deleted_at', "TEXT");
        await addColIfMissing('menu_items', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('menu_items', 'deleted_at', "TEXT");
        await addColIfMissing('ingredients', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('ingredients', 'deleted_at', "TEXT");
        await addColIfMissing('recipes', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('recipes', 'deleted_at', "TEXT");
        await addColIfMissing('extras', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('extras', 'deleted_at', "TEXT");
        await addColIfMissing('users', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('users', 'deleted_at', "TEXT");
        await addColIfMissing('suppliers', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('suppliers', 'deleted_at', "TEXT");
        await addColIfMissing('customers', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('customers', 'deleted_at', "TEXT");
        await addColIfMissing('purchase_orders', 'deleted', "INTEGER DEFAULT 0");
        await addColIfMissing('purchase_orders', 'deleted_at', "TEXT");

        // Add must_change_password to users (default FALSE — only owner can force this)
        await addColIfMissing('users', 'must_change_password', "BOOLEAN DEFAULT FALSE");

        // One-time fix: reset must_change_password for all users
        // Only staff users who haven't been deliberately forced should be reset
        const forcedUsers = await client.query("SELECT COUNT(*) as count FROM users WHERE must_change_password = TRUE AND role = 'staff'");
        if (parseInt(forcedUsers.rows[0].count) > 0) {
            await client.query("UPDATE users SET must_change_password = FALSE WHERE role = 'staff' AND must_change_password = TRUE");
            console.log('  Reset must_change_password for staff users');
        }

        await client.query('COMMIT');
        console.log('✓ Database initialized successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Database init error:', e.message);
        throw e;
    } finally {
        client.release();
    }
}

module.exports = { pool, dbRun, dbGet, dbAll, initDB };
