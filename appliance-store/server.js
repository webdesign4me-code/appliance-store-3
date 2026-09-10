const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend (public/ folder) as static files
app.use(express.static(path.join(__dirname, 'public')));

// Public config the checkout page needs - your payment account details to display,
// so customers know where to send money before typing in their transaction ID.
app.get('/api/config', (req, res) => {
  res.json({
    jazzcash: { number: process.env.JAZZCASH_NUMBER, name: process.env.JAZZCASH_ACCOUNT_TITLE },
    easypaisa: { number: process.env.EASYPAISA_NUMBER, name: process.env.EASYPAISA_ACCOUNT_TITLE },
    bank: {
      title: process.env.BANK_ACCOUNT_TITLE,
      bankName: process.env.BANK_NAME,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER,
      iban: process.env.BANK_IBAN
    }
  });
});

// API routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
