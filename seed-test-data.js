require('dotenv').config();
const { pool } = require('./db');

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing test data
    await client.query('DELETE FROM inventory_logs');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM sales');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM staff_logs');
    await client.query('DELETE FROM recipes');

    console.log('✓ Cleared existing data');

    // --- RECIPES ---
    const menuItems = (await client.query('SELECT id, name, sizes FROM menu_items')).rows;
    const ingredients = (await client.query('SELECT id, name, unit FROM ingredients')).rows;

    const recipeMap = {
      'Waakye': { 'Rice': 0.5, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Jollof & Chicken': { 'Rice': 0.5, 'Oil': 0.2, 'Chicken': 0.3, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Fried Rice & Chicken': { 'Rice': 0.5, 'Oil': 0.2, 'Chicken': 0.3, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Peppered Goat Rice': { 'Rice': 0.6, 'Oil': 0.2, 'Chicken': 0.2, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Assorted Jollof': { 'Rice': 0.6, 'Oil': 0.25, 'Sausage': 0.2, 'Chicken': 0.3, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Assorted Fried Rice': { 'Rice': 0.6, 'Oil': 0.25, 'Sausage': 0.2, 'Chicken': 0.3, 'Charcoal': 0.3, 'Packaging Bowls': 1 },
      'Noodles': { 'Noodles': 1, 'Oil': 0.1, 'Packaging Bowls': 1 },
      'Spaghetti': { 'Spaghetti': 1, 'Oil': 0.1, 'Packaging Bowls': 1 },
      'Loaded Fries': { 'Oil': 0.2, 'Sausage': 0.1, 'Packaging Bowls': 1 },
      'Juice': { 'Packaging Bowls': 1 },
    };

    const ingMap = {};
    for (const i of ingredients) ingMap[i.name] = i.id;

    let recipeCount = 0;
    for (const item of menuItems) {
      const sizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
      const recipe = recipeMap[item.name];
      if (!recipe) continue;
      for (const size of Object.keys(sizes)) {
        for (const [ingName, qty] of Object.entries(recipe)) {
          if (!ingMap[ingName]) continue;
          const multiplier = size === 'Big' ? 1.4 : 1;
          await client.query(
            'INSERT INTO recipes (menu_item_id, size, ingredient_id, quantity_needed) VALUES ($1, $2, $3, $4)',
            [item.id, size, ingMap[ingName], +(qty * multiplier).toFixed(2)]
          );
          recipeCount++;
        }
      }
    }
    console.log(`✓ Inserted ${recipeCount} recipe entries`);

    // --- SALES (past 7 days) ---
    const staffNames = ['Chef Jhamin', 'General Staff'];
    const paymentMethods = ['Cash', 'MoMo', 'Bolt Food', 'Delivery'];
    const extrasList = ['Sausage', 'Egg', 'Plantain', 'Rice', 'Salad'];

    const salesData = [];
    for (let day = 0; day < 7; day++) {
      const d = dateStr(day);
      const salesPerDay = day === 0 ? randomInt(4, 6) : randomInt(3, 7);
      for (let s = 0; s < salesPerDay; s++) {
        const item = randomItem(menuItems);
        const sizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
        const sizeNames = Object.keys(sizes);
        const size = randomItem(sizeNames);
        const unitPrice = sizes[size];
        const qty = randomInt(1, 3);
        const hasExtra = Math.random() > 0.5;
        const extraItem = hasExtra ? randomItem(extrasList) : null;
        const extraCost = hasExtra ? randomInt(1, 3) * 1 : 0;
        const total = unitPrice * qty + extraCost;

        salesData.push({
          date: d,
          staff: randomItem(staffNames),
          item: item.name,
          size,
          qty,
          unitPrice,
          extraItem,
          extraCost,
          total,
          payment: randomItem(paymentMethods),
        });
      }
    }

    for (const s of salesData) {
      await client.query(
        `INSERT INTO sales (date, staff, item, size, qty, "unitPrice", "extraItem", "extraCost", total, payment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [s.date, s.staff, s.item, s.size, s.qty, s.unitPrice, s.extraItem, s.extraCost, s.total, s.payment]
      );
    }
    console.log(`✓ Inserted ${salesData.length} sales across 7 days`);

    // --- EXPENSES (past 7 days) ---
    const expenseCategories = ['Rent', 'Utilities', 'Ingredients', 'Staff', 'Transport', 'Other'];
    const expenseDescriptions = {
      Rent: ['Monthly kitchen rent', 'Rent deposit'],
      Utilities: ['Electricity bill', 'Water bill', 'Internet bill'],
      Ingredients: ['Restocking rice bags', 'Chicken purchase', 'Oil and spices', 'Vegetables and herbs'],
      Staff: ['Staff salary advance', 'Overtime pay'],
      Transport: ['Delivery fuel', 'Market run transport', 'Supply delivery'],
      Other: ['Kitchen cleaning supplies', 'Equipment repair', 'Packaging materials'],
    };

    let expenseCount = 0;
    for (let day = 0; day < 7; day++) {
      const d = dateStr(day);
      const numExpenses = randomInt(1, 3);
      for (let e = 0; e < numExpenses; e++) {
        const cat = randomItem(expenseCategories);
        const desc = randomItem(expenseDescriptions[cat]);
        const amount = randomInt(20, 800);
        await client.query(
          'INSERT INTO expenses (date, category, amount, description, payment) VALUES ($1, $2, $3, $4, $5)',
          [d, cat, amount, desc, randomItem(['Cash', 'MoMo'])]
        );
        expenseCount++;
      }
    }
    console.log(`✓ Inserted ${expenseCount} expenses across 7 days`);

    // --- STAFF LOGS (past 4 days) ---
    let logCount = 0;
    for (let day = 0; day < 4; day++) {
      const d = dateStr(day);
      for (const name of staffNames) {
        const shift = randomItem(['Morning', 'Evening']);
        const timeIn = shift === 'Morning' ? `0${randomInt(6, 8)}:${String(randomInt(0, 59)).padStart(2, '0')}` : `${randomInt(12, 14)}:${String(randomInt(0, 59)).padStart(2, '0')}`;
        const outHour = shift === 'Morning' ? randomInt(13, 15) : randomInt(19, 22);
        const timeOut = `${outHour}:${String(randomInt(0, 59)).padStart(2, '0')}`;
        const hours = +(outHour - parseInt(timeIn.split(':')[0]) + (parseInt(timeOut.split(':')[1]) - parseInt(timeIn.split(':')[1])) / 60).toFixed(1);

        await client.query(
          `INSERT INTO staff_logs (date, name, shift, task, "timeIn", "timeOut", hours, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Closed')`,
          [d, name, shift, 'General', timeIn, timeOut, Math.max(hours, 1)]
        );
        logCount++;
      }
    }
    console.log(`✓ Inserted ${logCount} staff log entries`);

    // --- UPDATE INGREDIENT STOCKS ---
    // Calculate deductions from sales based on recipes
    const allRecipes = (await client.query('SELECT r.*, i.name as ing_name FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id')).rows;
    const deductions = {};
    for (const s of salesData) {
      const item = menuItems.find(m => m.name === s.item);
      if (!item) continue;
      const itemRecipes = allRecipes.filter(r => r.menu_item_id === item.id && r.size === s.size);
      for (const r of itemRecipes) {
        if (!deductions[r.ing_name]) deductions[r.ing_name] = 0;
        deductions[r.ing_name] += r.quantity_needed * s.qty;
      }
    }

    // Start with high stocks and subtract
    const baseStocks = { 'Rice': 50, 'Oil': 20, 'Chicken': 30, 'Sausage': 15, 'Spaghetti': 40, 'Charcoal': 30, 'Packaging Bowls': 200, 'Noodles': 30 };
    for (const [name, base] of Object.entries(baseStocks)) {
      const used = deductions[name] || 0;
      const remaining = Math.max(+(base - used).toFixed(1), 0);
      await client.query('UPDATE ingredients SET stock = $1 WHERE name = $2', [remaining, name]);
    }
    console.log('✓ Updated ingredient stocks based on sales deductions');

    // --- INVENTORY LOGS (stock in events) ---
    let logInvCount = 0;
    for (let day = 6; day >= 0; day--) {
      const d = dateStr(day);
      if (day % 3 === 0) {
        // Add some stock deliveries every 3 days
        for (const [name, base] of Object.entries(baseStocks)) {
          if (!ingMap[name]) continue;
          const addQty = randomInt(5, 15);
          const current = (await client.query('SELECT stock FROM ingredients WHERE name = $1', [name])).rows[0];
          const balance = current ? current.stock : 0;
          await client.query(
            'INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes) VALUES ($1, $2, $3, $4, $5, $6)',
            [d, ingMap[name], addQty, 'in', balance + addQty, 'Stock delivery']
          );
          await client.query('UPDATE ingredients SET stock = stock + $1 WHERE name = $2', [addQty, name]);
          logInvCount++;
        }
      }
      // Occasional manual stock out
      if (day % 2 === 0) {
        const randomIng = randomItem(Object.keys(ingMap));
        const removeQty = randomInt(1, 3);
        const current = (await client.query('SELECT stock FROM ingredients WHERE name = $1', [randomIng])).rows[0];
        if (current && current.stock >= removeQty) {
          await client.query(
            'INSERT INTO inventory_logs (date, ingredient_id, change_amount, type, balance_after, notes) VALUES ($1, $2, $3, $4, $5, $6)',
            [d, ingMap[randomIng], -removeQty, 'out', current.stock - removeQty, 'Manual adjustment']
          );
          await client.query('UPDATE ingredients SET stock = stock - $1 WHERE name = $2', [removeQty, randomIng]);
          logInvCount++;
        }
      }
    }
    console.log(`✓ Inserted ${logInvCount} inventory log entries`);

    // --- NOTIFICATIONS (for low stock items) ---
    const lowIngs = (await client.query('SELECT * FROM ingredients WHERE stock <= reorder_level')).rows;
    let notifCount = 0;
    for (const ing of lowIngs) {
      await client.query(
        `INSERT INTO notifications (type, title, message, ingredient_id, current_stock, reorder_level, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'low_stock',
          'Low Stock Alert',
          `${ing.name} is low! Current stock: ${ing.stock} ${ing.unit} (reorder at ${ing.reorder_level})`,
          ing.id,
          ing.stock,
          ing.reorder_level,
          Math.random() > 0.5 ? 1 : 0,
        ]
      );
      notifCount++;
    }
    console.log(`✓ Inserted ${notifCount} low stock notifications`);

    await client.query('COMMIT');
    console.log('\n✅ Database seeded successfully!');
    console.log(`   Sales: ${salesData.length} | Expenses: ${expenseCount} | Staff Logs: ${logCount} | Recipes: ${recipeCount}`);
    console.log(`   Inventory Logs: ${logInvCount} | Notifications: ${notifCount}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', e.message);
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
