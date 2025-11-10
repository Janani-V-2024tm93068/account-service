const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8082;

// Middleware
app.use(bodyParser.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// ---------------------------
// HEALTH & ROOT CHECKS
// ---------------------------

// Root route
app.get('/', (req, res) => res.send('Account Service running ✅'));

// Health check for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'account-service' });
});

// DB check route
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`✅ DB for ACCOUNT SERVICE Connected! Server time now: ${result.rows[0].now}`);
  } catch (err) {
    res.status(500).send('❌ DB connection failed: ' + err.message);
  }
});


// ---------------------------
// CRUD ENDPOINTS
// ---------------------------

// CREATE new account
app.post('/accounts', async (req, res) => {
  const { customer_id, account_number, account_type, balance, currency, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO accounts (customer_id, account_number, account_type, balance, currency, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, account_number, account_type, balance || 0, currency || 'INR', status || 'active']
    );
    res.status(201).json({ message: '✅ Account created successfully', account: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ all accounts
app.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts ORDER BY account_id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ account by ID
app.get('/accounts/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts WHERE account_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE account by ID
app.put('/accounts/:id', async (req, res) => {
  const { account_type, balance, currency, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE accounts SET account_type=$1, balance=$2, currency=$3, status=$4 WHERE account_id=$5 RETURNING *',
      [account_type, balance, currency, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: '✅ Account updated successfully', account: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE account by ID
app.delete('/accounts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM accounts WHERE account_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: '🗑️ Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// START SERVER
// ---------------------------
app.listen(port, () => console.log(`🚀 Account Service running on port ${port}`));
