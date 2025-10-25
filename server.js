const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
app.use(bodyParser.json());

// Hardcoded Railway MySQL internal connection
const pool = mysql.createPool({
  host: 'mysql.railway.internal', // Railway internal host
  port: 3306,
  user: 'root',
  password: 'aIOMgKsfRLUUQhXErEfiROPmVOMLZkcM',
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection
pool.query('SELECT 1')
  .then(() => console.log('✅ Database connected'))
  .catch(err => {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  });

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Users API running!' });
});

// USERS API
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password || null]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const id = req.params.id;

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (password !== undefined) { fields.push('password = ?'); values.push(password); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
