// ==============================
// Product data & rendering
// ==============================
const products = [
  { name: "Breathable Running Crop Top", price: 48, was: 63, label: "Tops" },
  { name: "Quick-Dry Athletic Shorts",    price: 39, was: 50, label: "Bottoms" },
];

const grid = document.getElementById('product-grid');

grid.innerHTML = products.map(p => {
  const save = p.was ? `<span class="save-tag">SAVE $${(p.was - p.price).toFixed(0)}</span>` : '';
  const priceRow = p.was
    ? `<span class="price-was">$${p.was}</span><span class="price-now">$${p.price}</span>`
    : `<span class="price-now">$${p.price}</span>`;
  return `
    <div class="product-card">
      <div class="ph product-photo" data-label="${p.label}">
        ${save}
        <button class="quick-add" aria-label="Quick add ${p.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M9 10a3 3 0 0 0 6 0"/>
          </svg>
        </button>
      </div>
      <div class="product-info">
        <div class="name">${p.name}</div>
        <div class="price-row">${priceRow}</div>
      </div>
    </div>`;
}).join('');

// ==============================
// Search bar (desktop expand + mobile dropdown)
// ==============================
const searchBtn = document.getElementById('searchBtn');
const searchWrap = searchBtn.closest('.search-wrap');
const searchInput = searchWrap.querySelector('.search-input');

const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
const mobileSearchClose = document.getElementById('mobileSearchClose');
const mobileSearchInput = document.getElementById('mobileSearchInput');

function isMobile(){
  return window.innerWidth <= 560;
}

function openMobileSearch(){
  mobileSearchOverlay.classList.add('active');
  setTimeout(() => mobileSearchInput.focus(), 300);
}
function closeMobileSearch(){
  mobileSearchOverlay.classList.remove('active');
  mobileSearchInput.value = '';
}

searchBtn.addEventListener('click', () => {
  if (isMobile()){
    openMobileSearch();
  } else {
    const isActive = searchWrap.classList.toggle('active');
    if (isActive) searchInput.focus();
    else searchInput.value = '';
  }
});

document.addEventListener('click', (e) => {
  if (isMobile()){
    const clickedInsideSearch = mobileSearchOverlay.contains(e.target);
    const clickedSearchBtn = searchBtn.contains(e.target);
    if (!clickedInsideSearch && !clickedSearchBtn){
      closeMobileSearch();
    }
  } else {
    if (!searchWrap.contains(e.target)){
      searchWrap.classList.remove('active');
      searchInput.value = '';
    }
  }
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchInput.value.trim() !== '') {
    console.log('Searching for:', searchInput.value);
  }
});

mobileSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && mobileSearchInput.value.trim() !== ''){
    console.log('Searching for:', mobileSearchInput.value);
    closeMobileSearch();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileSearch();
});

// ==============================
// Account slide-in panel
// ==============================
const accountBtn = document.getElementById('accountBtn');
const accountPanel = document.getElementById('accountPanel');
const accountOverlay = document.getElementById('accountOverlay');
const accountClose = document.getElementById('accountClose');

function openAccountPanel(){
  accountPanel.classList.add('active');
  accountOverlay.classList.add('active');
}
function closeAccountPanel(){
  accountPanel.classList.remove('active');
  accountOverlay.classList.remove('active');
}

accountBtn.addEventListener('click', openAccountPanel);
accountClose.addEventListener('click', closeAccountPanel);
accountOverlay.addEventListener('click', closeAccountPanel);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAccountPanel();
});

const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');

document.getElementById('showSignup').addEventListener('click', () => {
  loginView.style.display = 'none';
  signupView.style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', () => {
  signupView.style.display = 'none';
  loginView.style.display = 'block';
});

// Placeholder form handlers — swap with real auth logic later
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Login submitted (placeholder — no backend yet)');
});

document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Signup submitted (placeholder — no backend yet)');
});

// ==============================
// Cart panel
// ==============================
let cart = [];

const cartBadge = document.querySelector('.cart-count');
const cartBtnEl = document.querySelector('[aria-label="Cart"]');
const cartPanel = document.getElementById('cartPanel');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItemsEl = document.getElementById('cartItems');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const checkoutBtn = document.getElementById('checkoutBtn');

function openCartPanel(){
  cartPanel.classList.add('active');
  cartOverlay.classList.add('active');
}
function closeCartPanel(){
  cartPanel.classList.remove('active');
  cartOverlay.classList.remove('active');
}

function renderCart(){
  if (cart.length === 0){
    cartItemsEl.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
    cartSubtotalEl.textContent = '₦0';
    cartBadge.textContent = '0';
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="ph cart-item-photo" data-label=""></div>
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">$${item.price}</span>
        <div class="cart-qty-row">
          <button class="qty-btn" data-action="decrease" data-index="${index}">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-action="increase" data-index="${index}">+</button>
        </div>
        <button class="cart-remove" data-action="remove" data-index="${index}">Remove</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartSubtotalEl.textContent = `$${subtotal.toFixed(0)}`;

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  cartBadge.textContent = totalQty;
}

function addToCart(product){
  const existing = cart.find(item => item.name === product.name);
  if (existing){
    existing.qty++;
  } else {
    cart.push({ name: product.name, price: product.price, qty: 1 });
  }
  renderCart();
}

// Quick Add on product cards → adds real product to cart
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-add');
  if (btn){
    const card = btn.closest('.product-card');
    const name = card.querySelector('.name').textContent;
    const priceText = card.querySelector('.price-now').textContent.replace('$','');
    addToCart({ name, price: Number(priceText) });
  }
});

// Increase / decrease / remove inside the cart panel
cartItemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;

  if (action === 'increase') cart[index].qty++;
  if (action === 'decrease'){
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }
  if (action === 'remove') cart.splice(index, 1);

  renderCart();
});

cartBtnEl.addEventListener('click', openCartPanel);
cartClose.addEventListener('click', closeCartPanel);
cartOverlay.addEventListener('click', closeCartPanel);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCartPanel();
});

checkoutBtn.addEventListener('click', () => {
  console.log('Checkout clicked (placeholder — no backend yet)');
});

renderCart();

// ==============================
// Newsletter signup popup
// ==============================
const newsletterOverlay = document.getElementById('newsletterOverlay');
const newsletterModal = document.getElementById('newsletterModal');
const newsletterClose = document.getElementById('newsletterClose');
const newsletterDismiss = document.getElementById('newsletterDismiss');
const newsletterForm = document.getElementById('newsletterForm');

const NEWSLETTER_KEY = 'newsletterDismissed';
let newsletterShown = false;

function openNewsletter(){
  if (newsletterShown || localStorage.getItem(NEWSLETTER_KEY)) return;
  newsletterShown = true;
  newsletterOverlay.classList.add('active');
  newsletterModal.classList.add('active');
}

function closeNewsletter(remember = true){
  newsletterOverlay.classList.remove('active');
  newsletterModal.classList.remove('active');
  if (remember) localStorage.setItem(NEWSLETTER_KEY, 'true');
}

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const triggerPoint = window.innerHeight * 0.5; // half a screen's worth of scrolling
  if (scrolled > triggerPoint){
    openNewsletter();
  }
}, { passive: true });

newsletterClose.addEventListener('click', () => closeNewsletter());
newsletterDismiss.addEventListener('click', () => closeNewsletter());
newsletterOverlay.addEventListener('click', () => closeNewsletter());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNewsletter();
});

newsletterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Newsletter signup submitted (placeholder — no backend yet)');
  closeNewsletter();
});

// ==============================
// Category filtering
// ==============================
const categoryButtons = document.querySelectorAll('.category-btn');
const productCards = document.querySelectorAll('.product-card');

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;

    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    productCards.forEach(card => {
      const matches = category === 'all' || card.dataset.category === category;
      card.style.display = matches ? '' : 'none';
    });

    // Close the mobile dropdown after picking a category
    const filterList = document.querySelector('.filters ul');
    const filterToggle = document.querySelector('.filter-toggle');
    if (filterList && filterList.classList.contains('open')){
      filterList.classList.remove('open');
      filterToggle.classList.remove('open');
    }
  });
});

// ==============================
// Mobile filter dropdown toggle
// ==============================
const filterToggle = document.querySelector('.filter-toggle');
const filterList = document.querySelector('.filters ul');

if (filterToggle){
  filterToggle.addEventListener('click', () => {
    filterList.classList.toggle('open');
    filterToggle.classList.toggle('open');
  });
}

// ==============================
// Per-card size selection
// ==============================
productCards.forEach(card => {
  const sizeButtons = card.querySelectorAll('.size');
  const addToCartBtn = card.querySelector('.add-to-cart');
  let selectedSize = null;

  sizeButtons.forEach(sizeBtn => {
    sizeBtn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('selected'));
      sizeBtn.classList.add('selected');
      selectedSize = sizeBtn.textContent.trim();
    });
  });

  if (addToCartBtn){
    addToCartBtn.addEventListener('click', () => {
      if (!selectedSize){
        showSizeHint(card);
        return;
      }
      const name = card.querySelector('h3').textContent;
      const priceText = card.querySelector('.price').textContent.replace('$','');
      addToCart({ name: `${name} (${selectedSize})`, price: Number(priceText) });
    });
  }
});

function showSizeHint(card){
  let hint = card.querySelector('.size-hint');
  if (!hint){
    hint = document.createElement('div');
    hint.className = 'size-hint';
    hint.textContent = 'Pick a size first';
    card.querySelector('.product-image').insertAdjacentElement('afterend', hint);
  }
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 1500);
}

// ==============================
// Quick View modal
// ==============================
const quickviewOverlay = document.getElementById('quickviewOverlay');
const quickviewModal = document.getElementById('quickviewModal');
const quickviewClose = document.getElementById('quickviewClose');
const quickviewImg = document.getElementById('quickviewImg');
const quickviewName = document.getElementById('quickviewName');
const quickviewPrice = document.getElementById('quickviewPrice');
const quickviewSizes = document.getElementById('quickviewSizes');
const quickviewAdd = document.getElementById('quickviewAdd');

function openQuickView(card){
  const img = card.querySelector('.product-image img.front');
  const name = card.querySelector('h3').textContent;
  const price = card.querySelector('.price').textContent;
  const sizes = [...card.querySelectorAll('.size')].map(s => s.textContent.trim());

  quickviewImg.src = img.src;
  quickviewImg.alt = img.alt;
  quickviewName.textContent = name;
  quickviewPrice.textContent = price;

  let selectedSize = null;
  quickviewSizes.innerHTML = sizes.map(s => `<button class="size" data-size="${s}">${s}</button>`).join('');
  quickviewSizes.querySelectorAll('.size').forEach(btn => {
    btn.addEventListener('click', () => {
      quickviewSizes.querySelectorAll('.size').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSize = btn.dataset.size;
    });
  });

  quickviewAdd.onclick = () => {
    if (!selectedSize){
      quickviewAdd.textContent = 'Pick a size first';
      setTimeout(() => { quickviewAdd.textContent = 'Add to Bag'; }, 1500);
      return;
    }
    addToCart({ name: `${name} (${selectedSize})`, price: Number(price.replace('$','')) });
    closeQuickView();
  };

  quickviewOverlay.classList.add('active');
  quickviewModal.classList.add('active');
}

function closeQuickView(){
  quickviewOverlay.classList.remove('active');
  quickviewModal.classList.remove('active');
}

document.querySelectorAll('.quick-view').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.product-card');
    openQuickView(card);
  });
});

quickviewClose.addEventListener('click', closeQuickView);
quickviewOverlay.addEventListener('click', closeQuickView);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeQuickView();
});