// Run this ONCE to create your admin login: node create-admin.js
// Edit the username/password below first.

const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

const USERNAME = 'adminname';
const PASSWORD = 'simp61sons#'; // change before running!

async function run() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  try {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
      [USERNAME, hash]
    );
    console.log(`Admin user "${USERNAME}" created. You can now log in at /admin/login.html`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('That username already exists.');
    } else {
      console.error(err);
    }
  }
  process.exit();
}

run();
