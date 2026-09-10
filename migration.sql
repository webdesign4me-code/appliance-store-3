-- Only run this if you already set up the database BEFORE this update
-- (i.e. you have an old "orders" table with a paypal_order_id column).
-- If you're setting up fresh, ignore this file and just use schema.sql.
--
-- Run with: mysql -u root -p appliance_store < db/migration.sql

ALTER TABLE orders DROP COLUMN IF EXISTS paypal_order_id;
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'bank' AFTER total;
ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100) NOT NULL DEFAULT '' AFTER payment_method;
ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(30) AFTER customer_email;
ALTER TABLE orders MODIFY status VARCHAR(20) NOT NULL DEFAULT 'pending_verification';
UPDATE orders SET status = 'pending_verification' WHERE status = 'pending';
