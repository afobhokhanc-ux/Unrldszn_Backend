
// Auto-apply a category filter if arriving via a link like shop.html?category=joggers
const urlParams = new URLSearchParams(window.location.search);
const requestedCategory = urlParams.get('category');
if (requestedCategory){
  const matchingBtn = document.querySelector(`.category-btn[data-category="${requestedCategory}"]`);
  if (matchingBtn) matchingBtn.click();
}

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

    // Close the hamburger menu too, if that's where the click came from
    const mobileNavPanel = document.getElementById('mobileNavPanel');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    if (mobileNavPanel && mobileNavPanel.classList.contains('active')){
      mobileNavPanel.classList.remove('active');
      mobileNavOverlay.classList.remove('active');
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
      const priceText = card.querySelector('.price').textContent.replace(/[^0-9.]/g,'');
      const image = card.querySelector('.product-image img.front').src;
      addToCart({ name: `${name} (${selectedSize})`, price: Number(priceText), image });
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
    addToCart({ name: `${name} (${selectedSize})`, price: Number(price.replace(/[^0-9.]/g,'')), image: img.src });
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

// ==============================
// Mobile nav menu (hamburger)
// ==============================
const hamburgerBtn = document.getElementById('hamburgerBtn');
if (hamburgerBtn){
  const mobileNavPanel = document.getElementById('mobileNavPanel');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');

  function openMobileNav(){
    mobileNavPanel.classList.add('active');
    mobileNavOverlay.classList.add('active');
  }
  function closeMobileNav(){
    mobileNavPanel.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
  }

  hamburgerBtn.addEventListener('click', openMobileNav);
  mobileNavClose.addEventListener('click', closeMobileNav);
  mobileNavOverlay.addEventListener('click', closeMobileNav);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
  });
}