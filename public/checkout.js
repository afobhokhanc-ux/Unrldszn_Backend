// ==============================
// Checkout page
// ==============================
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
const $ = (id) => document.getElementById(id);

// Only allow normal web or relative image addresses
function safeImageUrl(url){
  try {
    const u = new URL(url, window.location.href);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch (e) {
    return '';
  }
}

function renderSummary(data){
  const lines = $('summaryLines');
  lines.innerHTML = '';

  data.lines.forEach(line => {
    const row = document.createElement('div');
    row.className = 'summary-line';

    const src = safeImageUrl(line.image);
    if (src){
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      row.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'summary-line-ph';
      row.appendChild(ph);
    }

    const info = document.createElement('div');
    info.className = 'summary-line-info';
    const name = document.createElement('strong');
    name.textContent = line.name;
    const qty = document.createElement('span');
    qty.textContent = `Qty ${line.qty} × ${naira(line.unitPrice)}`;
    info.append(name, qty);
    row.appendChild(info);

    const price = document.createElement('div');
    price.className = 'summary-line-price';
    price.textContent = naira(line.lineTotal);
    row.appendChild(price);

    lines.appendChild(row);
  });

  $('summarySubtotal').textContent = naira(data.subtotal);
  $('summaryShipping').textContent = data.shipping === 0 ? 'Free' : naira(data.shipping);
  $('summaryTotal').textContent = naira(data.total);

  const problems = $('summaryProblems');
  if (data.problems.length){
    problems.style.display = 'block';
    problems.innerHTML = '';
    data.problems.forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      problems.appendChild(p);
    });
    const fix = document.createElement('a');
    fix.href = 'shop.html';
    fix.textContent = 'Back to the shop to fix your cart';
    problems.appendChild(fix);
    $('payBtn').disabled = true;
  }
}

async function startCheckout(){
  try {
    const me = await fetch('/api/me');
    const meData = await me.json();
    $('checkoutLoading').style.display = 'none';

    if (!meData.loggedIn){
      $('checkoutLoginNotice').style.display = 'block';
      return;
    }

    const res = await fetch('/api/checkout/summary');
    const data = await res.json();

    if (!res.ok || (data.lines.length === 0 && data.problems.length === 0)){
      $('checkoutEmptyNotice').style.display = 'block';
      return;
    }

    renderSummary(data);
    $('checkoutGrid').style.display = 'grid';

    const nameField = $('checkoutForm').elements['fullName'];
    if (!nameField.value && meData.user && meData.user.name) nameField.value = meData.user.name;
  } catch (err) {
    $('checkoutLoading').style.display = 'block';
    $('checkoutLoading').textContent = 'Something went wrong loading your order. Please refresh the page.';
  }
}

$('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payBtn = $('payBtn');
  const errorEl = $('checkoutError');
  errorEl.textContent = '';

  const delivery = {
    fullName: form.elements['fullName'].value,
    phone: form.elements['phone'].value,
    address: form.elements['address'].value,
    city: form.elements['city'].value,
    state: form.elements['state'].value
  };

  payBtn.disabled = true;
  payBtn.textContent = 'Taking you to Paystack...';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery })
    });
    const data = await res.json();

    if (!res.ok){
      errorEl.textContent = data.error || 'Could not start the payment.';
      payBtn.disabled = false;
      payBtn.textContent = 'Pay with Paystack';
      return;
    }

    window.location.href = data.authorization_url;
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
    payBtn.disabled = false;
    payBtn.textContent = 'Pay with Paystack';
  }
});

// If someone presses Back from Paystack, make sure the button works again
window.addEventListener('pageshow', () => {
  const payBtn = $('payBtn');
  if (payBtn && !$('summaryProblems').innerHTML){
    payBtn.disabled = false;
    payBtn.textContent = 'Pay with Paystack';
  }
});

startCheckout();
