const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const VALID_METHODS = ['cod', 'jazzcash', 'easypaisa', 'bank'];

// POST /api/orders/create
// Body: { items, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, transactionId }
// For jazzcash/easypaisa/bank: customer has already sent money manually and pastes
// the transaction ID here. For cod: no transaction ID needed, they pay on delivery.
// Either way we save the order as "pending_verification" - stock is NOT touched yet.
// You (admin) confirm the order (payment received, or accept the COD order), then
// click Confirm or Reject.
router.post('/create', async (req, res) => {
  const {
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    paymentMethod,
    transactionId
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  if (!VALID_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }
  if (paymentMethod !== 'cod' && (!transactionId || !transactionId.trim())) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }
  if (!customerName || !customerPhone) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Prices always come from OUR database, never trusted from the browser.
    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const [rows] = await connection.query(
        'SELECT id, name, price, stock FROM products WHERE id = ?',
        [item.productId]
      );
      if (rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }
      const product = rows[0];
      const quantity = parseInt(item.quantity, 10) || 0;

      if (quantity < 1) {
        throw new Error(`Invalid quantity for ${product.name}`);
      }
      if (product.stock < quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      total += product.price * quantity;
      orderItemsData.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price
      });
    }

    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (status, total, payment_method, transaction_id, customer_name, customer_email, customer_phone, shipping_address)
       VALUES ('pending_verification', ?, ?, ?, ?, ?, ?, ?)`,
      [total, paymentMethod, paymentMethod === 'cod' ? 'COD - pay on delivery' : transactionId.trim(), customerName, customerEmail || null, customerPhone, shippingAddress || null]
    );
    const orderId = orderResult.insertId;

    for (const item of orderItemsData) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.name, item.quantity, item.unitPrice]
      );
    }

    await connection.commit();
    res.json({ orderId, total, status: 'pending_verification' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to create order' });
  } finally {
    connection.release();
  }
});

module.exports = router;
