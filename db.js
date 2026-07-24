const DATABASE_URL = process.env.DATABASE_URL;
const USE_PG = !!DATABASE_URL;

let pool, dbRun, dbGet, dbAll, initDB, getClient;

if (USE_PG) {
    const { Pool } = require('pg');
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('Unexpected error on idle client', err));

    dbRun = async (sql, params = []) => {
        const client = await pool.connect();
        try {
            const result = await client.query(sql, params);
            return { lastID: result.rows[0]?.id || result.rowCount, changes: result.rowCount, rows: result.rows };
        } finally { client.release(); }
    };

    dbGet = async (sql, params = []) => {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
    };

    dbAll = async (sql, params = []) => {
        const result = await pool.query(sql, params);
        return result.rows;
    };

    getClient = async () => {
        const client = await pool.connect();
        return {
            query: (sql, params) => client.query(sql, params),
            release: () => client.release(),
        };
    };

    initDB = async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, fullname TEXT)`);
            await client.query(`CREATE TABLE IF NOT EXISTS menu_items (id SERIAL PRIMARY KEY, name TEXT, sizes TEXT, category TEXT)`);
            await client.query(`CREATE TABLE IF NOT EXISTS ingredients (id SERIAL PRIMARY KEY, name TEXT UNIQUE, unit TEXT, stock REAL DEFAULT 0, reorder_level REAL DEFAULT 5, cost_per_unit REAL DEFAULT 0)`);
            await client.query(`CREATE TABLE IF NOT EXISTS recipes (id SERIAL PRIMARY KEY, menu_item_id INTEGER, size TEXT, ingredient_id INTEGER, quantity_needed REAL, FOREIGN KEY(menu_item_id) REFERENCES menu_items(id), FOREIGN KEY(ingredient_id) REFERENCES ingredients(id))`);
            await client.query(`CREATE TABLE IF NOT EXISTS extras (id SERIAL PRIMARY KEY, name TEXT, price REAL)`);
            await client.query(`CREATE TABLE IF NOT EXISTS sales (id SERIAL PRIMARY KEY, date TEXT, staff TEXT, item TEXT, size TEXT, qty INTEGER, "unitPrice" REAL, "extraItem" TEXT, "extraCost" REAL, total REAL, payment TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, deleted INTEGER DEFAULT 0, deleted_at TEXT, deleted_by TEXT)`);
            await client.query(`CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, date TEXT, category TEXT, amount REAL, description TEXT, payment TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await client.query(`CREATE TABLE IF NOT EXISTS staff_logs (id SERIAL PRIMARY KEY, date TEXT, name TEXT, shift TEXT, task TEXT, "timeIn" TEXT, "timeOut" TEXT, hours REAL, "closingCash" REAL, "momoCheck" TEXT, notes TEXT, status TEXT DEFAULT 'Closed')`);
            await client.query(`CREATE TABLE IF NOT EXISTS inventory_logs (id SERIAL PRIMARY KEY, date TEXT, ingredient_id INTEGER, change_amount REAL, type TEXT, balance_after REAL, notes TEXT)`);
            await client.query(`CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, data TEXT)`);
            await client.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, type TEXT, title TEXT, message TEXT, ingredient_id INTEGER, current_stock REAL, reorder_level REAL, is_read INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await client.query(`CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, email TEXT, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await client.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await client.query(`CREATE TABLE IF NOT EXISTS purchase_orders (id SERIAL PRIMARY KEY, supplier_id INTEGER, date TEXT, items TEXT, total REAL DEFAULT 0, status TEXT DEFAULT 'Pending', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
            await client.query(`CREATE TABLE IF NOT EXISTS audit_log (id SERIAL PRIMARY KEY, action TEXT NOT NULL, table_name TEXT, record_id INTEGER, record_summary TEXT, old_values TEXT, new_values TEXT, performed_by TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

            const addColIfMissing = async (table, col, def) => {
                const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [table]);
                if (!cols.rows.find(c => c.column_name === col)) await client.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
            };

            await addColIfMissing('sales', 'deleted', "INTEGER DEFAULT 0");
            await addColIfMissing('sales', 'deleted_at', "TEXT");
            await addColIfMissing('sales', 'deleted_by', "TEXT");
            await addColIfMissing('sales', 'customer_name', "TEXT");
            await addColIfMissing('sales', 'discount', "REAL DEFAULT 0");
            await addColIfMissing('sales', 'refund', "INTEGER DEFAULT 0");
            await addColIfMissing('sales', 'refund_reason', "TEXT");
            await addColIfMissing('menu_items', 'available', "INTEGER DEFAULT 1");
            await addColIfMissing('inventory_logs', 'performed_by', "TEXT");

            const userCount = await client.query("SELECT count(*) as count FROM users");
            if (parseInt(userCount.rows[0].count) === 0) {
                const bcrypt = require('bcryptjs');
                const hashAdmin = await bcrypt.hash('admin123', 10);
                const hashStaff = await bcrypt.hash('staff123', 10);
                await client.query("INSERT INTO users (username, password, role, fullname) VALUES ($1, $2, $3, $4)", ['admin', hashAdmin, 'owner', 'Chef Jhamin']);
                await client.query("INSERT INTO users (username, password, role, fullname) VALUES ($1, $2, $3, $4)", ['staff', hashStaff, 'staff', 'General Staff']);
                console.log('Default users created');
            }

            const ingCount = await client.query("SELECT count(*) as count FROM ingredients");
            if (parseInt(ingCount.rows[0].count) === 0) {
                const ings = [['Rice','Bags',10,2],['Oil','Gallons',5,2],['Chicken','Cartons',10,3],['Sausage','Cartons',5,2],['Spaghetti','Boxes',20,5],['Charcoal','Bags',10,2],['Packaging Bowls','Packs',50,10],['Noodles','Boxes',15,3]];
                for (const i of ings) await client.query("INSERT INTO ingredients (name, unit, stock, reorder_level) VALUES ($1, $2, $3, $4)", i);
                console.log('Default ingredients created');
            }

            const extCount = await client.query("SELECT count(*) as count FROM extras");
            if (parseInt(extCount.rows[0].count) === 0) {
                const extras = [['Sausage',2],['Egg',1],['Plantain',1.5],['Rice',3],['Salad',2]];
                for (const e of extras) await client.query("INSERT INTO extras (name, price) VALUES ($1, $2)", e);
                console.log('Default extras created');
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
                for (const item of items) await client.query("INSERT INTO menu_items (name, sizes, category) VALUES ($1, $2, $3)", [item.name, JSON.stringify(item.sizes), item.category]);
                console.log('Default menu items created');
            }

            const settingsCount = await client.query("SELECT count(*) as count FROM settings");
            if (parseInt(settingsCount.rows[0].count) === 0) {
                await client.query("INSERT INTO settings (data) VALUES ($1)", [JSON.stringify({ businessName: "Chef Jhamin's Kitchen", weeklyTarget: 21000, expenseLimit: 6300, dailyTarget: 3000 })]);
                console.log('Default settings created');
            }

            const timestamps = [
                ['users', 'created_at'], ['users', 'updated_at'], ['menu_items', 'created_at'], ['menu_items', 'updated_at'],
                ['ingredients', 'created_at'], ['ingredients', 'updated_at'], ['recipes', 'created_at'], ['recipes', 'updated_at'],
                ['extras', 'created_at'], ['extras', 'updated_at'], ['expenses', 'updated_at'],
                ['staff_logs', 'created_at'], ['staff_logs', 'updated_at'], ['inventory_logs', 'created_at'],
                ['settings', 'updated_at'], ['suppliers', 'updated_at'], ['customers', 'updated_at'], ['purchase_orders', 'updated_at'],
            ];
            for (const [t, c] of timestamps) await addColIfMissing(t, c, "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

            const softDeletes = [
                ['expenses', 'deleted'], ['expenses', 'deleted_at'], ['staff_logs', 'deleted'], ['staff_logs', 'deleted_at'],
                ['menu_items', 'deleted'], ['menu_items', 'deleted_at'], ['ingredients', 'deleted'], ['ingredients', 'deleted_at'],
                ['recipes', 'deleted'], ['recipes', 'deleted_at'], ['extras', 'deleted'], ['extras', 'deleted_at'],
                ['users', 'deleted'], ['users', 'deleted_at'], ['suppliers', 'deleted'], ['suppliers', 'deleted_at'],
                ['customers', 'deleted'], ['customers', 'deleted_at'], ['purchase_orders', 'deleted'], ['purchase_orders', 'deleted_at'],
            ];
            for (const [t, c] of softDeletes) await addColIfMissing(t, c, "INTEGER DEFAULT 0");
            await addColIfMissing('users', 'must_change_password', "BOOLEAN DEFAULT FALSE");

            const forcedUsers = await client.query("SELECT COUNT(*) as count FROM users WHERE must_change_password = TRUE AND role = 'staff'");
            if (parseInt(forcedUsers.rows[0].count) > 0) {
                await client.query("UPDATE users SET must_change_password = FALSE WHERE role = 'staff' AND must_change_password = TRUE");
            }

            await client.query('COMMIT');
            console.log('Database initialized (PostgreSQL)');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Database init error:', e.message);
            throw e;
        } finally { client.release(); }
    };

} else {
    const initSqlJs = require('sql.js');
    const fs = require('fs');
    const path = require('path');
    const DB_PATH = path.join(__dirname, 'kitchen.db');
    let sqldb = null;

    function toSql(sql) {
        return sql.replace(/\$(\d+)/g, '?');
    }

    function persist() {
        if (sqldb) {
            const data = sqldb.export();
            fs.writeFileSync(DB_PATH, Buffer.from(data));
        }
    }

    function queryAll(sql, params = []) {
        const stmt = sqldb.prepare(toSql(sql));
        if (params.length) stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    function queryOne(sql, params = []) {
        const stmt = sqldb.prepare(toSql(sql));
        if (params.length) stmt.bind(params);
        let row = null;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
    }

    function runSql(sql, params = []) {
        sqldb.run(toSql(sql), params);
        const changes = sqldb.getRowsModified();
        const lastRow = queryAll("SELECT last_insert_rowid() as id");
        return { lastID: lastRow[0]?.id || 0, changes, rows: [] };
    }

    dbRun = async (sql, params = []) => {
        const result = runSql(sql, params);
        persist();
        return result;
    };

    dbGet = async (sql, params = []) => queryOne(sql, params);

    dbAll = async (sql, params = []) => queryAll(sql, params);

    getClient = async () => {
        return {
            query(sql, params = []) {
                const trimmed = sql.trim().toUpperCase();
                if (trimmed === 'BEGIN') { sqldb.run('BEGIN'); return {}; }
                if (trimmed === 'COMMIT') { sqldb.run('COMMIT'); persist(); return {}; }
                if (trimmed === 'ROLLBACK') { sqldb.run('ROLLBACK'); return {}; }
                if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
                    return { rows: queryAll(sql, params) };
                }
                const result = runSql(sql, params);
                return { rowCount: result.changes, rows: result.rows };
            },
            release() {},
        };
    };

    initDB = async () => {
        const SQL = await initSqlJs();
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            sqldb = new SQL.Database(buffer);
        } else {
            sqldb = new SQL.Database();
        }
        sqldb.run('PRAGMA foreign_keys = ON');

        function addCol(table, col, def) {
            const cols = queryAll(`PRAGMA table_info(${table})`).map(c => c.name);
            if (!cols.includes(col)) sqldb.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        }

        sqldb.run(`
            CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, fullname TEXT);
            CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sizes TEXT, category TEXT);
            CREATE TABLE IF NOT EXISTS ingredients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, unit TEXT, stock REAL DEFAULT 0, reorder_level REAL DEFAULT 5, cost_per_unit REAL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, menu_item_id INTEGER, size TEXT, ingredient_id INTEGER, quantity_needed REAL, FOREIGN KEY(menu_item_id) REFERENCES menu_items(id), FOREIGN KEY(ingredient_id) REFERENCES ingredients(id));
            CREATE TABLE IF NOT EXISTS extras (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL);
            CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, staff TEXT, item TEXT, size TEXT, qty INTEGER, unitPrice REAL, extraItem TEXT, extraCost REAL, total REAL, payment TEXT, timestamp TEXT DEFAULT (datetime('now')), deleted INTEGER DEFAULT 0, deleted_at TEXT, deleted_by TEXT);
            CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, category TEXT, amount REAL, description TEXT, payment TEXT, timestamp TEXT DEFAULT (datetime('now')));
            CREATE TABLE IF NOT EXISTS staff_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, name TEXT, shift TEXT, task TEXT, timeIn TEXT, timeOut TEXT, hours REAL, closingCash REAL, momoCheck TEXT, notes TEXT, status TEXT DEFAULT 'Closed');
            CREATE TABLE IF NOT EXISTS inventory_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, ingredient_id INTEGER, change_amount REAL, type TEXT, balance_after REAL, notes TEXT);
            CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT);
            CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, title TEXT, message TEXT, ingredient_id INTEGER, current_stock REAL, reorder_level REAL, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, address TEXT, created_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, date TEXT, items TEXT, total REAL DEFAULT 0, status TEXT DEFAULT 'Pending', notes TEXT, created_at TEXT DEFAULT (datetime('now')));
            CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, table_name TEXT, record_id INTEGER, record_summary TEXT, old_values TEXT, new_values TEXT, performed_by TEXT, created_at TEXT DEFAULT (datetime('now')));
        `);

        addCol('sales', 'customer_name', 'TEXT');
        addCol('sales', 'discount', 'REAL DEFAULT 0');
        addCol('sales', 'refund', 'INTEGER DEFAULT 0');
        addCol('sales', 'refund_reason', 'TEXT');
        addCol('menu_items', 'available', 'INTEGER DEFAULT 1');
        addCol('inventory_logs', 'performed_by', 'TEXT');
        addCol('users', 'must_change_password', 'BOOLEAN DEFAULT 0');

        const timestamps = [
            ['users','created_at'],['users','updated_at'],['menu_items','created_at'],['menu_items','updated_at'],
            ['ingredients','created_at'],['ingredients','updated_at'],['recipes','created_at'],['recipes','updated_at'],
            ['extras','created_at'],['extras','updated_at'],['expenses','updated_at'],
            ['staff_logs','created_at'],['staff_logs','updated_at'],['inventory_logs','created_at'],
            ['settings','updated_at'],['suppliers','updated_at'],['customers','updated_at'],['purchase_orders','updated_at'],
        ];
        for (const [t, c] of timestamps) addCol(t, c, "TEXT DEFAULT (datetime('now'))");

        const softDeletes = [
            ['expenses','deleted'],['expenses','deleted_at'],['staff_logs','deleted'],['staff_logs','deleted_at'],
            ['menu_items','deleted'],['menu_items','deleted_at'],['ingredients','deleted'],['ingredients','deleted_at'],
            ['recipes','deleted'],['recipes','deleted_at'],['extras','deleted'],['extras','deleted_at'],
            ['users','deleted'],['users','deleted_at'],['suppliers','deleted'],['suppliers','deleted_at'],
            ['customers','deleted'],['customers','deleted_at'],['purchase_orders','deleted'],['purchase_orders','deleted_at'],
        ];
        for (const [t, c] of softDeletes) addCol(t, c, 'INTEGER DEFAULT 0');

        const userCount = queryOne("SELECT count(*) as count FROM users");
        if (userCount.count === 0) {
            const bcrypt = require('bcryptjs');
            const hashAdmin = bcrypt.hashSync('admin123', 10);
            const hashStaff = bcrypt.hashSync('staff123', 10);
            sqldb.run("INSERT INTO users (username, password, role, fullname) VALUES (?, ?, ?, ?)", ['admin', hashAdmin, 'owner', 'Chef Jhamin']);
            sqldb.run("INSERT INTO users (username, password, role, fullname) VALUES (?, ?, ?, ?)", ['staff', hashStaff, 'staff', 'General Staff']);
            console.log('Default users created');
        }

        const ingCount = queryOne("SELECT count(*) as count FROM ingredients");
        if (ingCount.count === 0) {
            const ings = [['Rice','Bags',10,2],['Oil','Gallons',5,2],['Chicken','Cartons',10,3],['Sausage','Cartons',5,2],['Spaghetti','Boxes',20,5],['Charcoal','Bags',10,2],['Packaging Bowls','Packs',50,10],['Noodles','Boxes',15,3]];
            for (const i of ings) sqldb.run("INSERT INTO ingredients (name, unit, stock, reorder_level) VALUES (?, ?, ?, ?)", i);
            console.log('Default ingredients created');
        }

        const extCount = queryOne("SELECT count(*) as count FROM extras");
        if (extCount.count === 0) {
            const extras = [['Sausage',2],['Egg',1],['Plantain',1.5],['Rice',3],['Salad',2]];
            for (const e of extras) sqldb.run("INSERT INTO extras (name, price) VALUES (?, ?)", e);
            console.log('Default extras created');
        }

        const menuCount = queryOne("SELECT count(*) as count FROM menu_items");
        if (menuCount.count === 0) {
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
            for (const item of items) sqldb.run("INSERT INTO menu_items (name, sizes, category) VALUES (?, ?, ?)", [item.name, JSON.stringify(item.sizes), item.category]);
            console.log('Default menu items created');
        }

        const settingsCount = queryOne("SELECT count(*) as count FROM settings");
        if (settingsCount.count === 0) {
            sqldb.run("INSERT INTO settings (data) VALUES (?)", [JSON.stringify({ businessName: "Chef Jhamin's Kitchen", weeklyTarget: 21000, expenseLimit: 6300, dailyTarget: 3000 })]);
            console.log('Default settings created');
        }

        persist();
        console.log('Database initialized (SQLite)');
    };
}

module.exports = { pool, dbRun, dbGet, dbAll, initDB, getClient };
