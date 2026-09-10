# AeroWarm - Fans & Heaters Store

Full-stack e-commerce site: Node.js + Express backend, MySQL database, and an
admin panel. Frontend is plain HTML/CSS/JS (no build step, easy to edit).

**Payment methods: Cash on Delivery, JazzCash, Easypaisa, bank transfer.**
There is no PayPal/Stripe/payment gateway. For JazzCash/Easypaisa/bank, the
customer sends money themselves to an account you control, then types their
transaction ID into the checkout form. For COD, they just place the order
and pay when it arrives — no transaction ID needed. Either way the order
sits as "pending verification" until you confirm it in the admin panel
(check your account for JazzCash/Easypaisa/bank, or just review/accept for
COD orders).

## 1. Install dependencies

```
npm install
```

Requires Node.js 18 or newer.

## 2. Set up the database

```
mysql -u root -p < db/schema.sql
```

This creates the `appliance_store` database with `products`, `orders`,
`order_items`, `admin_users` tables, and 4 sample products.

## 3. Configure environment variables

```
cp .env.example .env
```

Then edit `.env` and fill in:
- Your MySQL username/password
- Your real JazzCash number, Easypaisa number, and bank account details —
  these are shown to customers at checkout so they know where to send money
  (not needed for COD orders)
- A random long string for `JWT_SECRET`

## 4. Create your admin login

Open `create-admin.js`, change the `USERNAME` and `PASSWORD` at the top, then:

```
node create-admin.js
```

## 5. Run the server

```
npm start
```

Visit:
- `http://localhost:5000` — the storefront
- `http://localhost:5000/admin/login.html` — admin panel

## How the order flow works

1. Buyer adds items to cart, goes to checkout, fills in name/phone/address.
2. Buyer picks Cash on Delivery, JazzCash, Easypaisa, or bank transfer.
   For the last three, the page shows your account details (pulled from
   `.env`, never hardcoded) and the buyer sends money **themselves**, outside
   this website, using their own JazzCash/Easypaisa/banking app, then pastes
   the transaction ID into the form. For COD, they just submit — no
   transaction ID.
3. The order is saved as `pending_verification`. **Stock is NOT deducted
   yet** — it's only checked for availability at this point.
4. You log into the admin panel's Orders tab. For JazzCash/Easypaisa/bank,
   check your account for a matching transaction; for COD, just review the
   order. Click **Mark paid** / **Confirm order** to accept it, or **Reject**
   to decline it.
5. Only on confirm does stock actually get deducted (with row locking, so
   two orders can't both deduct the last unit at the same moment).

## Known limitations (things to know before relying on this)

- **No automatic payment verification.** Anyone can type a fake transaction
  ID, or place a COD order they never accept delivery of. This system only
  works if you actually check before clicking "Mark paid"/"Confirm."
- **No email/SMS notifications.** The buyer isn't automatically told when
  their order is confirmed or rejected — contact them manually using the
  phone/email they provided, or add a notification service later.
- **Stock isn't reserved while an order is pending.** Since deduction only
  happens at confirmation, two pending orders can both "pass" the initial
  stock check for the last unit — whichever you confirm first gets it, and
  confirming the second will show a stock error. Check pending orders
  promptly, especially for low-stock items.
- **Single admin role.** No "staff vs owner" distinction — every admin
  account can do everything.
- **No COD abuse protection.** There's nothing stopping repeat fake COD
  orders (a common issue for COD stores in Pakistan) — some store owners
  call to confirm phone numbers before dispatching.

## Project structure

```
appliance-store/
├── server.js              Express app entry point
├── create-admin.js         One-time script to create an admin login
├── db/
│   ├── schema.sql          MySQL table definitions + sample data (fresh installs)
│   ├── migration.sql        Run instead if you already had an older PayPal-based DB
│   └── pool.js             MySQL connection pool
├── middleware/auth.js       JWT check for admin routes
├── routes/
│   ├── products.js          Public product + category listing
│   ├── orders.js             Place order (COD / JazzCash / Easypaisa / bank)
│   └── admin.js               Admin login, product CRUD, image upload, order verify/reject
└── public/                  Frontend (served as static files)
    ├── uploads/               Product photos uploaded from the admin panel land here
    ├── index.html            Storefront
    ├── cart.html             Cart
    ├── checkout.html          Checkout form + payment instructions
    └── admin/
        ├── login.html
        └── dashboard.html      Manage products (with photo upload), verify/reject orders
```
