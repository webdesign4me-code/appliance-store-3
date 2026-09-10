const grid = document.getElementById('product-grid');
const filterBar = document.getElementById('filter-bar');
let currentCategory = '';

// Build the category filter buttons from whatever categories actually exist,
// instead of a hardcoded list - so adding a 3rd, 4th, 5th category in the
// admin panel automatically shows up here.
async function loadCategoryFilters() {
  try {
    const res = await fetch('/api/products/categories');
    const categories = await res.json();
    const buttons = ['<button class="filter-btn active" data-category="">All</button>']
      .concat(
        categories.map(
          (c) => `<button class="filter-btn" data-category="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`
        )
      );
    filterBar.innerHTML = buttons.join('');
    attachFilterHandlers();
  } catch (err) {
    filterBar.innerHTML = '<button class="filter-btn active" data-category="">All</button>';
  }
}

function attachFilterHandlers() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      loadProducts(currentCategory);
    });
  });
}

async function loadProducts(category = '') {
  grid.innerHTML = '<p class="empty-msg">Loading products...</p>';
  try {
    const url = category ? `/api/products?category=${category}` : '/api/products';
    const res = await fetch(url);
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    grid.innerHTML = '<p class="empty-msg">Could not load products. Is the server running?</p>';
  }
}

function renderProducts(products) {
  if (products.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No products in this category yet.</p>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
    <div class="product-card">
      <img src="${p.image_url || 'https://via.placeholder.com/220x160?text=No+Image'}" alt="${p.name}">
      <div class="info">
        <h3>${p.name}</h3>
        <div class="price">${formatPKR(p.price)}</div>
        <div class="stock">${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}</div>
        <button ${p.stock <= 0 ? 'disabled' : ''} onclick='addToCart(${JSON.stringify(p)})'>
          ${p.stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

loadCategoryFilters();
loadProducts();
