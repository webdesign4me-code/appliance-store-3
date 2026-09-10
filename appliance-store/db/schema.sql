-- Run this once to set up your database:
--   mysql -u root -p < db/schema.sql
--
-- If you already ran an older version of this file, see db/migration.sql
-- instead - it updates your existing database without deleting your data.

CREATE DATABASE IF NOT EXISTS appliance_store;
USE appliance_store;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- free text - type any category you want (fan, heater, iron, blender...)
  description TEXT,
  price DECIMAL(10,2) NOT NULL, -- PKR
  image_url VARCHAR(500),
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_verification', -- pending_verification -> paid / rejected
  total DECIMAL(10,2) NOT NULL, -- PKR
  payment_method VARCHAR(20) NOT NULL, -- jazzcash, easypaisa, bank
  transaction_id VARCHAR(100) NOT NULL, -- what the customer typed in at checkout
  customer_name VARCHAR(150),
  customer_email VARCHAR(150),
  customer_phone VARCHAR(30),
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL, -- snapshot in case product changes later
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample products so the store isn't empty on first run (prices in PKR)
INSERT INTO products (name, category, description, price, image_url, stock) VALUES
('TurboBreeze Pedestal Fan', 'fan', 'Adjustable height pedestal fan with 3 speed settings and oscillation.', 6500.00, 'https://images.unsplash.com/photo-1580494564185-8d7d8a998a7e?w=500', 25),
('CoolMax Table Fan', 'fan', 'Compact table fan, quiet motor, perfect for desks and bedside tables.', 3200.00, 'https://images.unsplash.com/photo-1580420920096-84fdf46b3e9a?w=500', 40),
('WarmGlow Ceramic Heater', 'heater', 'Fast-heating ceramic space heater with tip-over safety switch.', 7500.00, 'https://images.unsplash.com/photo-1607083681678-af8e3ba1a2e5?w=500', 15),
('InfraHeat Panel Heater', 'heater', 'Wall-mountable infrared panel heater, energy efficient for small rooms.', 14500.00, 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=500', 10);
