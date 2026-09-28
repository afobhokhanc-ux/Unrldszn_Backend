// ==============================
// Shared cart state (persists across pages)
// ==============================
const CART_KEY = 'unrldszn_cart';

function loadCart(){
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    return [];
  }
}
function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

let cart = loadCart();

// ==============================
// Search bar (desktop expand + mobile dropdown)
// ==============================
const searchBtn = document.getElementById('searchBtn');
if (searchBtn){
  const searchWrap = searchBtn.closest('.search-wrap');
  const searchInput = searchWrap.querySelector('.search-input');

  const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
  const mobileSearchBackdrop = document.getElementById('mobileSearchBackdrop');
  const mobileSearchClose = document.getElementById('mobileSearchClose');
  const mobileSearchInput = document.getElementById('mobileSearchInput');

  function isMobile(){
    return window.innerWidth <= 560;
  }

  function openMobileSearch(){
    mobileSearchOverlay.classList.add('active');
    if (mobileSearchBackdrop) mobileSearchBackdrop.classList.add('active');
    setTimeout(() => mobileSearchInput.focus(), 300);
  }
  function closeMobileSearch(){
    mobileSearchOverlay.classList.remove('active');
    if (mobileSearchBackdrop) mobileSearchBackdrop.classList.remove('active');
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

  if (mobileSearchBackdrop){
    mobileSearchBackdrop.addEventListener('click', closeMobileSearch);
  }

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

  mobileSearchClose.addEventListener('click', closeMobileSearch);

  // Real functional search: runs on Enter, filters product cards if present on the page,
  // otherwise redirects to the shop page with a query string.
  function runSearch(query){
    const q = query.trim().toLowerCase();
    if (!q) return;

    const cards = document.querySelectorAll('.product-card');
    if (cards.length){
      let anyVisible = false;
      cards.forEach(card => {
        const name = (card.querySelector('h3, .name')?.textContent || '').toLowerCase();
        const match = name.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      // Clear any active category filter highlight since we're searching instead
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    } else {
      window.location.href = `shop.html?q=${encodeURIComponent(q)}`;
    }
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
      runSearch(searchInput.value);
    }
  });

  mobileSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
      runSearch(mobileSearchInput.value);
      closeMobileSearch();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSearch();
  });

  // If arriving from a search redirect (?q=...), run it once products are on the page
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q');
  if (initialQuery){
    document.addEventListener('DOMContentLoaded', () => runSearch(initialQuery));
  }
}

// ==============================
// Account slide-in panel
// ==============================
const accountBtn = document.getElementById('accountBtn');
if (accountBtn){
  const accountPanel = document.getElementById('accountPanel');
  const accountOverlay = document.getElementById('accountOverlay');
  const accountClose = document.getElementById('accountClose');
  const loginView = document.getElementById('loginView');
  const signupView = document.getElementById('signupView');
  const loggedInView = document.getElementById('loggedInView');
  const accountUserName = document.getElementById('accountUserName');
  const logoutBtn = document.getElementById('logoutBtn');

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

  document.getElementById('showSignup').addEventListener('click', () => {
    loginView.style.display = 'none';
    signupView.style.display = 'block';
  });
  document.getElementById('showLogin').addEventListener('click', () => {
    signupView.style.display = 'none';
    loginView.style.display = 'block';
  });

  function showAccountError(message){
    let errorEl = document.getElementById('accountError');
    if (!errorEl){
      errorEl = document.createElement('p');
      errorEl.id = 'accountError';
      errorEl.style.color = 'var(--rust)';
      errorEl.style.fontSize = '13px';
      errorEl.style.marginTop = '-10px';
      errorEl.style.marginBottom = '14px';
      const activeView = loginView.style.display === 'none' ? signupView : loginView;
      activeView.querySelector('form').insertAdjacentElement('beforebegin', errorEl);
    }
    errorEl.textContent = message;
  }

  function updateAccountUI(user){
    loginView.style.display = 'none';
    signupView.style.display = 'none';
    loggedInView.style.display = 'block';
    accountUserName.textContent = user.name;
  }

  function resetAccountUI(){
    loggedInView.style.display = 'none';
    signupView.style.display = 'none';
    loginView.style.display = 'block';
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok){
        showAccountError(data.error || 'Login failed.');
        return;
      }

      closeAccountPanel();
      updateAccountUI(data.user);
      form.reset();
    } catch (err) {
      showAccountError('Something went wrong. Please try again.');
    }
  });

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirm = form.confirm.value;

    if (password !== confirm){
      showAccountError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok){
        showAccountError(data.error || 'Signup failed.');
        return;
      }

      closeAccountPanel();
      updateAccountUI(data.user);
      form.reset();
    } catch (err) {
      showAccountError('Something went wrong. Please try again.');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      // even if the request fails, still reset the UI locally
    }
    resetAccountUI();
    closeAccountPanel();
  });

  // Check on page load whether someone's already logged in (their cookie is still valid)
  fetch('/api/me')
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn){
        updateAccountUI(data.user);
      }
    })
    .catch(() => {});
}

// ==============================
// Cart panel (shared across all pages)
// ==============================
const cartBtnEl = document.querySelector('[aria-label="Cart"]');
let cartBadge, cartPanel, cartOverlay, cartClose, cartItemsEl, cartSubtotalEl, checkoutBtn;

if (cartBtnEl){
  cartBadge = document.querySelector('.cart-count');
  cartPanel = document.getElementById('cartPanel');
  cartOverlay = document.getElementById('cartOverlay');
  cartClose = document.getElementById('cartClose');
  cartItemsEl = document.getElementById('cartItems');
  cartSubtotalEl = document.getElementById('cartSubtotal');
  checkoutBtn = document.getElementById('checkoutBtn');

  function openCartPanel(){
    cartPanel.classList.add('active');
    cartOverlay.classList.add('active');
  }
  function closeCartPanel(){
    cartPanel.classList.remove('active');
    cartOverlay.classList.remove('active');
  }

  cartBtnEl.addEventListener('click', openCartPanel);
  cartClose.addEventListener('click', closeCartPanel);
  cartOverlay.addEventListener('click', closeCartPanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCartPanel();
  });

  checkoutBtn.addEventListener('click', () => {
    console.log('Checkout clicked (placeholder — no backend yet)');
  });

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

    saveCart();
    renderCart();
  });
}

function renderCart(){
  if (!cartItemsEl) return;

  if (cart.length === 0){
    cartItemsEl.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
    cartSubtotalEl.textContent = '₦0';
    cartBadge.textContent = '0';
    return;
  }

    cartItemsEl.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      ${item.image
        ? `<img src="${item.image}" alt="${item.name}" class="cart-item-photo">`
        : `<div class="ph cart-item-photo" data-label=""></div>`}
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">₦${item.price}</span>
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
  cartSubtotalEl.textContent = `₦${subtotal.toFixed(0)}`;

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  cartBadge.textContent = totalQty;
}

function addToCart(product){
  const existing = cart.find(item => item.name === product.name);
  if (existing){
    existing.qty++;
  } else {
    cart.push({ name: product.name, price: product.price, qty: 1, image: product.image || '' });
  }
  saveCart();
  renderCart();
  flashCartIcon();
}

// Small visual confirmation when something is added
function flashCartIcon(){
  if (!cartBtnEl) return;
  cartBtnEl.classList.add('cart-flash');
  setTimeout(() => cartBtnEl.classList.remove('cart-flash'), 400);
}

renderCart();

// ==============================
// Newsletter signup popup
// ==============================
const newsletterOverlay = document.getElementById('newsletterOverlay');
if (newsletterOverlay){
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
    const triggerPoint = window.innerHeight * 0.5;
    if (scrolled > triggerPoint) openNewsletter();
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
}
  const loggedInView = document.getElementById('loggedInView');
  const accountUserName = document.getElementById('accountUserName');
  const logoutBtn = document.getElementById('logoutBtn');

  function updateAccountUI(user){
    loginView.style.display = 'none';
    signupView.style.display = 'none';
    loggedInView.style.display = 'block';
    accountUserName.textContent = user.name;
  }

  function resetAccountUI(){
    loggedInView.style.display = 'none';
    signupView.style.display = 'none';
    loginView.style.display = 'block';
  }

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      // even if the request fails, still reset the UI locally
    }
    resetAccountUI();
    closeAccountPanel();
  });