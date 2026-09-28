// ==============================
// Homepage: New Releases product grid
// ==============================
const products = [
  { name: "Breathable Running Crop Top", price: 48, was: 63, label: "Tops", category: "tank-tops", image: "sleeveblackA.JPG" },
  { name: "Quick-Dry Athletic Shorts",    price: 39, was: 50, label: "Bottoms", category: "joggers", image: "jogB.JPG" },
];

const grid = document.getElementById('product-grid');

grid.innerHTML = products.map(p => {
  const save = p.was ? `<span class="save-tag">SAVE $${(p.was - p.price).toFixed(0)}</span>` : '';
  const priceRow = p.was
    ? `<span class="price-was">₦${p.was}</span><span class="price-now">₦${p.price}</span>`
    : `<span class="price-now">₦${p.price}</span>`;
  return `
    <a class="product-card" href="shop.html?category=${p.category}">
      <div class="ph product-photo" data-label="${p.label}">
        <img src="${p.image}" alt="${p.name}">
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
    </a>`;
}).join('');

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-add');
  if (btn){
    e.preventDefault();      // stop the card's link from navigating
    e.stopPropagation();
    const card = btn.closest('.product-card');
    const name = card.querySelector('.name').textContent;
    const priceText = card.querySelector('.price-now').textContent.replace('₦','');
    addToCart({ name, price: Number(priceText) });
  }
});