const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
require('dotenv').config();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Everything below this line requires a valid admin token
router.use(requireAdmin);

// ---- Image upload ----
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// POST /api/admin/upload - upload a product image, returns the URL to save on the product
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---- Products ----
// GET /api/admin/products/categories - distinct category list (for the admin form suggestions)
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    res.json(rows.map((r) => r.category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/admin/products - add a new product
router.post('/products', async (req, res) => {
  const { name, category, description, price, imageUrl, stock } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ error: 'name, category, and price are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, category, description, price, image_url, stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category, description || '', price, imageUrl || '', stock || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// PUT /api/admin/products/:id - edit a product
router.put('/products/:id', async (req, res) => {
  const { name, category, description, price, imageUrl, stock } = req.body;
  try {
    await pool.query(
      `UPDATE products SET name=?, category=?, description=?, price=?, image_url=?, stock=?
       WHERE id=?`,
      [name, category, description, price, imageUrl, stock, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ---- Orders ----
// GET /api/admin/orders - view all orders with their items
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    for (const order of orders) {
      const [items] = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/admin/orders/:id/verify
// You've checked your JazzCash/Easypaisa/bank account and confirmed the money
// arrived. This marks the order paid and deducts stock (with row locking so
// concurrent orders can't oversell the same product).
router.post('/orders/:id/verify', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }
    const order = orderRows[0];

    if (order.status !== 'pending_verification') {
      await connection.commit();
      return res.json({ status: order.status, note: 'Order was already processed' });
    }

    const [items] = await connection.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    for (const item of items) {
      const [productRows] = await connection.query(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      const currentStock = productRows[0].stock;
      if (currentStock < item.quantity) {
        throw new Error(`Not enough stock left for ${item.product_name} - adjust manually`);
      }
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.query(`UPDATE orders SET status = 'paid' WHERE id = ?`, [order.id]);
    await connection.commit();
    res.json({ status: 'paid' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to verify order' });
  } finally {
    connection.release();
  }
});

// POST /api/admin/orders/:id/reject
// Payment didn't arrive / transaction ID didn't match. Stock was never touched
// for a pending order, so there's nothing to restore.
router.post('/orders/:id/reject', async (req, res) => {
  try {
    await pool.query(
      `UPDATE orders SET status = 'rejected' WHERE id = ? AND status = 'pending_verification'`,
      [req.params.id]
    );
    res.json({ status: 'rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

module.exports = router;
