// Cart is stored in the browser's localStorage as a simple array:
// [{ productId, name, price, quantity }, ...]
// This is fine for a cart (not sensitive data) - real prices are re-checked
// server-side when the order is created, so nothing here has to be trusted.

// Formats a number as PKR with commas, no decimals: 4000 -> "Rs 4,000"
function formatPKR(amount) {
  return 'Rs ' + Math.round(Number(amount)).toLocaleString('en-PK');
}

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1
    });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.productId !== productId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem('cart');
  updateCartCount();
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) {
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    el.textContent = count;
  }
}

document.addEventListener('DOMContentLoaded', updateCartCount);
