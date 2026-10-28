// ============================================================
// UNRLDSZN product catalog — the SERVER's source of truth for prices.
//
// Customers' browsers can't be trusted with prices (anyone can edit a page
// in their browser). So at checkout the server ignores whatever price the
// browser has and looks the price up here instead.
//
// To add a product or change a price: edit this list, then redeploy.
// The key is the product name in LOWERCASE; the name must match what is
// shown on your shop page (capital letters don't matter).
// Prices are in naira.
// ============================================================

const CATALOG = {
  'unrld flame sweats':   { name: 'UNRLD Flame Sweats',   price: 25000 },
  'unrld polo':           { name: 'UNRLD Polo',           price: 25000 },
  'unrld longsleeve':     { name: 'UNRLD LongSleeve',     price: 25000 },
  'unrld tank top':       { name: 'UNRLD Tank Top',       price: 16000 },
  'unrld tee':            { name: 'UNRLD Tee',            price: 18000 },
  'hmmf tee':             { name: 'HMMF Tee',             price: 18000 },
  'fwtt tee':             { name: 'FWTT Tee',             price: 18000 },
  'art is freedom tee':   { name: 'Art Is Freedom Tee',   price: 20000 }
};

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Cart item names look like "UNRLD Polo (M)" — split into name and size.
function parseItemName(fullName){
  const match = /^(.*\S)\s*\(([A-Za-z0-9]+)\)$/.exec(String(fullName).trim());
  if (match){
    return { base: match[1].trim(), size: match[2].toUpperCase() };
  }
  return { base: String(fullName).trim(), size: null };
}

// Turn a saved cart into priced order lines using ONLY the catalog above.
// Returns { lines, subtotal, shipping, total, problems }.
// "problems" lists anything that stops the order (unknown product, missing size...).
function priceCart(items, shippingFee){
  const lines = [];
  const problems = [];

  for (const item of items){
    const { base, size } = parseItemName(item.name);
    const product = CATALOG[base.toLowerCase()];

    if (!product){
      problems.push(`"${item.name}" is not available for checkout. Please remove it from your cart.`);
      continue;
    }
    if (!size || !SIZES.includes(size)){
      problems.push(`Please choose a size for "${product.name}".`);
      continue;
    }

    const qty = Number(item.qty);
    lines.push({
      name: `${product.name} (${size})`,
      productName: product.name,
      size,
      qty,
      unitPrice: product.price,
      lineTotal: product.price * qty,
      image: item.image || ''
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = lines.length ? shippingFee : 0;
  return { lines, subtotal, shipping, total: subtotal + shipping, problems };
}

module.exports = { CATALOG, SIZES, parseItemName, priceCart };
