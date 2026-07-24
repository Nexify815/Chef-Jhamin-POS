require('dotenv').config();
const { pool } = require('./db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE ingredients SET stock = 1 WHERE name = 'Chicken'");
    await client.query("UPDATE ingredients SET stock = 0.5 WHERE name = 'Oil'");
    await client.query("UPDATE ingredients SET stock = 1 WHERE name = 'Charcoal'");

    const low = (await client.query('SELECT * FROM ingredients WHERE stock <= reorder_level')).rows;
    for (const i of low) {
      await client.query(
        `INSERT INTO notifications (type, title, message, ingredient_id, current_stock, reorder_level, is_read)
         VALUES ('low_stock', 'Low Stock Alert', $1, $2, $3, $4, 0)`,
        [`${i.name} is low! Current: ${i.stock} ${i.unit} (reorder at ${i.reorder_level})`, i.id, i.stock, i.reorder_level]
      );
    }
    console.log(`Set ${low.length} ingredients to low stock, notifications created`);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
